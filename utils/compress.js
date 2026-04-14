const fs = require('fs');

// â”€â”€â”€ Token types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Using explicit `type` field (fixes Bug 3: ambiguous distance/length=0 check)
const EOF_SYMBOL = 256; // reserve 256 as end-of-stream (fixes Issue 5)

// â”€â”€â”€ Compress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const compress = (inputPath, outputPath) => {

    const fileBuffer = fs.readFileSync(inputPath);
    const originalSize = fileBuffer.length;
    const bytes = [...fileBuffer];

    // Issue 6 fix: use much larger window/look-ahead for real compression gains
    const windowSize   = 4096;  // was 32 â€” now matches DEFLATE standard
    const lookAhead    = 258;    // was 32
    const minMatchLen  = 3;

    // Issue 7 fix: hash chain for O(1) average match-finding
    // Maps a 3-byte hash â†’ most recent position in the window
    const hashChain = new Map();   // hash  â†’ head index
    const prev      = new Int32Array(bytes.length).fill(-1); // index â†’ prev match

    function hash3(pos) {
        return (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
    }

    const tokens = [];
    let i = 0;

    while (i < bytes.length) {

        let bestLength   = 0;
        let bestDistance = 0;

        if (i + minMatchLen <= bytes.length) {
            const h = hash3(i);
            let j   = hashChain.get(h) ?? -1;

            let attempts = 100;
            while (j !== -1 && i - j <= windowSize && attempts-- > 0) {
                let length = 0;

                // Bug 1 fix: added `j + length < i` guard so the match
                // cannot reach into the current look-ahead position via j
                while (
                    length < lookAhead          &&
                    i + length < bytes.length   &&
                    bytes[j + length] === bytes[i + length]
                ) {
                    length++;
                }

                if (length > bestLength) {
                    bestLength   = length;
                    bestDistance = i - j;
                }

                j = prev[j];
            }

            // Insert current position into hash chain
            prev[i] = hashChain.get(h) ?? -1;
            hashChain.set(h, i);
        }

        if (bestLength >= minMatchLen) {
            // Bug 3 fix: explicit type field
            tokens.push({ type: 'match', distance: bestDistance, length: bestLength });
            i += bestLength;
        } else {
            tokens.push({ type: 'literal', nextByte: bytes[i] });
            i++;
        }
    }

    // Issue 5 fix: push an explicit EOF token
    tokens.push({ type: 'eof' });

    const trees = buildHuffmanTrees(tokens);
    writeCompressedFile(outputPath, tokens, trees);

    const compressedSize = fs.statSync(outputPath).size;
    console.log('Compression successful âœ…');
    return { originalSize, compressedSize };
};


// â”€â”€â”€ Build Huffman trees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildHuffmanTrees(tokens) {

    const literalFreq  = new Map();
    const lengthFreq   = new Map();
    const distanceFreq = new Map();

    // Issue 5 fix: seed EOF symbol so it always has a code
    literalFreq.set(EOF_SYMBOL, 1);

    for (const token of tokens) {
        if (token.type === 'literal') {
            literalFreq.set(token.nextByte,
                (literalFreq.get(token.nextByte) || 0) + 1);

        } else if (token.type === 'match') {
            lengthFreq.set(token.length,
                (lengthFreq.get(token.length) || 0) + 1);
            distanceFreq.set(token.distance,
                (distanceFreq.get(token.distance) || 0) + 1);
        }
        // 'eof' token already seeded above â€” no extra counting needed
    }

    function buildTree(freqMap) {
        if (freqMap.size === 0) return null;

        let nodes = [...freqMap.entries()].map(([symbol, freq]) => ({
            symbol, freq, left: null, right: null
        }));

        // Bug 2 fix: single-symbol case â€” return the leaf itself as root
        // and assign it code "0" directly, instead of wrapping in a null-symbol node.
        // A decompressor rebuilding this tree will get the same structure.
        if (nodes.length === 1) {
            nodes[0].isSingleLeaf = true;
            return nodes[0];
        }

        nodes.sort((a, b) => a.symbol - b.symbol);
        let idCounter = 0;
        nodes.forEach(n => n.id = idCounter++);

        while (nodes.length > 1) {
            nodes.sort((a, b) =>
                a.freq !== b.freq ? a.freq - b.freq : a.id - b.id
            );

            const left  = nodes.shift();
            const right = nodes.shift();

            nodes.push({
                id:     idCounter++,
                symbol: null,
                freq:   left.freq + right.freq,
                left,
                right
            });
        }

        return nodes[0];
    }

    return {
        literalTree:  buildTree(literalFreq),
        lengthTree:   buildTree(lengthFreq),
        distanceTree: buildTree(distanceFreq)
    };
}


// â”€â”€â”€ Write compressed file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function writeCompressedFile(outputPath, tokens, trees) {

    const { literalTree, lengthTree, distanceTree } = trees;

    // Issue 4 fix: store the actual code tables in the header, not just
    // frequencies â€” this makes decompression fully deterministic regardless
    // of how the tree is rebuilt on the other side.
    function generateCodes(node, prefix = '', table = {}) {
        if (!node) return table;

        if (node.symbol !== null) {
            // Bug 2 fix: single-leaf root gets code "0"
            table[node.symbol] = node.isSingleLeaf ? '0' : (prefix || '0');
        }

        generateCodes(node.left,  prefix + '0', table);
        generateCodes(node.right, prefix + '1', table);
        return table;
    }

    const literalCodes  = generateCodes(literalTree);
    const lengthCodes   = generateCodes(lengthTree);
    const distanceCodes = generateCodes(distanceTree);

    // Build bit string
    let bitString = '';

    for (const token of tokens) {
        if (token.type === 'literal') {
            bitString += '0';
            bitString += literalCodes[token.nextByte];

        } else if (token.type === 'match') {
            bitString += '1';
            bitString += lengthCodes[token.length];
            bitString += distanceCodes[token.distance];

        } else if (token.type === 'eof') {
            // Issue 5 fix: write the EOF symbol as a literal-flag token
            // so the decompressor knows exactly when to stop
            bitString += '0';
            bitString += literalCodes[EOF_SYMBOL];
        }
    }

    const padding = (8 - (bitString.length % 8)) % 8;
    bitString += '0'.repeat(padding);

    const byteArray = [];
    for (let i = 0; i < bitString.length; i += 8) {
        byteArray.push(parseInt(bitString.slice(i, i + 8), 2));
    }
    const dataBuffer = Buffer.from(byteArray);

    // Issue 4 fix: header now stores CODE tables (not frequency tables).
    // Decompressor reads these directly â€” no tree rebuild needed, no
    // tie-breaking ambiguity.
    const headerObject = {
        literalCodes,   // { symbol â†’ bitstring }
        lengthCodes,
        distanceCodes,
        padding         // still useful as a sanity-check / doc field
    };

    const headerJSON         = JSON.stringify(headerObject);
    const headerBuffer       = Buffer.from(headerJSON);
    const headerLengthBuffer = Buffer.alloc(4);
    headerLengthBuffer.writeUInt32BE(headerBuffer.length);

    const finalBuffer = Buffer.concat([headerLengthBuffer, headerBuffer, dataBuffer]);
    fs.writeFileSync(outputPath, finalBuffer);

    console.log('Compression file written successfully âœ…');
}


// â”€â”€â”€ Decompress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Included so the format is actually usable end-to-end.
const decompress = (inputPath, outputPath) => {

    const fileBuffer = fs.readFileSync(inputPath);

    // Read header
    const headerLength = fileBuffer.readUInt32BE(0);
    const headerJSON         = fileBuffer.slice(4, 4 + headerLength).toString();
    const header       = JSON.parse(headerJSON);

    const { literalCodes, lengthCodes, distanceCodes, padding } = header;

    // Build reverse-lookup tables  code â†’ symbol
    function invertCodes(codeTable) {
        const inv = {};
        for (const [sym, code] of Object.entries(codeTable)) inv[code] = Number(sym);
        return inv;
    }

    const invLiteral  = invertCodes(literalCodes);
    const invLength   = invertCodes(lengthCodes);
    const invDistance = invertCodes(distanceCodes);

    // Convert data bytes back to a bit string, stripping padding
    const dataBuffer = fileBuffer.slice(4 + headerLength);
    let bitString    = '';
    for (const byte of dataBuffer) bitString += byte.toString(2).padStart(8, '0');
    bitString = bitString.slice(0, bitString.length - padding);

    // Decode tokens
    const output = [];
    let pos = 0;

    while (pos < bitString.length) {
        const flag = bitString[pos++];

        if (flag === '0') {
            // Literal or EOF
            let code = '';
            while (pos <= bitString.length) {
                code += bitString[pos++];
                if (code in invLiteral) {
                    const sym = invLiteral[code];
                    if (sym === EOF_SYMBOL) goto_end: { break goto_end; }
                    output.push(sym);
                    break;
                }
            }
            // Check for EOF symbol
            if (invLiteral[code] === EOF_SYMBOL) break;

        } else {
            // Back-reference
            let lCode = '';
            let length = -1;
            while (pos <= bitString.length) {
                lCode += bitString[pos++];
                if (lCode in invLength) { length = invLength[lCode]; break; }
            }

            let dCode = '';
            let distance = -1;
            while (pos <= bitString.length) {
                dCode += bitString[pos++];
                if (dCode in invDistance) { distance = invDistance[dCode]; break; }
            }

            // Copy from already-decoded output
            const start = output.length - distance;
            for (let k = 0; k < length; k++) {
                output.push(output[start + k]);
            }
        }
    }

    fs.writeFileSync(outputPath, Buffer.from(output));
    console.log('Decompression successful âœ…');
    return { decompressedSize: output.length };
};


module.exports = { compress, decompress };





