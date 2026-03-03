const fs = require('fs');

const compress = (inputPath, outputPath) => {

    const fileBuffer = fs.readFileSync(inputPath);
    const originalSize = fileBuffer.length;
    const bytes = [...fileBuffer];

    const tokens = [];

    const windowSize = 32;
    const lookAhead = 32;
    const minMatchLength = 3;

    let i = 0;

    while (i < bytes.length) {

        let bestLength = 0;
        let bestDistance = 0;

        const searchStart = Math.max(0, i - windowSize);

        for (let j = searchStart; j < i; j++) {

            let length = 0;

            while (
                length < lookAhead &&
                i + length < bytes.length &&
                bytes[j + length] === bytes[i + length]
            ) {
                length++;
            }

            if (length > bestLength) {
                bestLength = length;
                bestDistance = i - j;
            }
        }

        if (bestLength >= minMatchLength) {


            tokens.push({
                distance: bestDistance,
                length: bestLength
            });


            i += bestLength;

        } else {

            tokens.push({
                distance: 0,
                length: 0,
                nextByte: bytes[i]
            });

            i++;
        }
    }

    const trees = buildHuffmanTrees(tokens);
    writeCompressedFile(outputPath, tokens, trees);

    const compressedSize = fs.statSync(outputPath).size;

    console.log("Compression successful ✅");
    return {
        originalSize,
        compressedSize
    };
};


function buildHuffmanTrees(tokens) {



    const literalFreq = new Map();
    const lengthFreq = new Map();
    const distanceFreq = new Map();

    for (let token of tokens) {

        if (token.distance === 0 && token.length === 0) {

            literalFreq.set(
                token.nextByte,
                (literalFreq.get(token.nextByte) || 0) + 1
            );
        } else {

            lengthFreq.set(
                token.length,
                (lengthFreq.get(token.length) || 0) + 1
            );

            distanceFreq.set(
                token.distance,
                (distanceFreq.get(token.distance) || 0) + 1
            );
        }
    }



    function buildTree(freqMap) {

        if (freqMap.size === 0) return null;

        let nodes = [...freqMap.entries()].map(([symbol, freq]) => ({
            symbol,
            freq,
            left: null,
            right: null
        }));

        nodes.sort((a, b) => a.symbol - b.symbol);
        let idCounter = 0;
        nodes.forEach(n => n.id = idCounter++);


        if (nodes.length === 1) {
            return {
                symbol: null,
                freq: nodes[0].freq,
                left: nodes[0],
                right: null
            };
        }

        while (nodes.length > 1) {

            nodes.sort((a, b) => {
                if (a.freq !== b.freq) return a.freq - b.freq;
                return a.id - b.id;
            });

            const left = nodes.shift();
            const right = nodes.shift();

            nodes.push({
                id: idCounter++,
                symbol: null,
                freq: left.freq + right.freq,
                left,
                right
            });
        }

        return nodes[0];
    }



    return {
        literalTree: buildTree(literalFreq),
        lengthTree: buildTree(lengthFreq),
        distanceTree: buildTree(distanceFreq)
    };
}

function writeCompressedFile(outputPath, tokens, trees) {

    const { literalTree, lengthTree, distanceTree } = trees;



    function generateCodes(node, prefix = "", table = {}) {
        if (!node) return table;

        if (node.symbol !== null) {
            table[node.symbol] = prefix || "0";
        }

        generateCodes(node.left, prefix + "0", table);
        generateCodes(node.right, prefix + "1", table);

        return table;
    }

    const literalCodes = generateCodes(literalTree);
    const lengthCodes = generateCodes(lengthTree);
    const distanceCodes = generateCodes(distanceTree);



    let bitString = "";

    for (let token of tokens) {

    if (token.distance === 0 && token.length === 0) {

        bitString += "0";
        bitString += literalCodes[token.nextByte];

    } else {

        bitString += "1";
        bitString += lengthCodes[token.length];
        bitString += distanceCodes[token.distance];
    }
}



    let padding = (8 - (bitString.length % 8)) % 8;
    bitString += "0".repeat(padding);


    const byteArray = [];

    for (let i = 0; i < bitString.length; i += 8) {
        byteArray.push(parseInt(bitString.slice(i, i + 8), 2));
    }

    const dataBuffer = Buffer.from(byteArray);



    function extractFreq(tree) {
        const freq = {};

        function traverse(node) {
            if (!node) return;
            if (node.symbol !== null) {
                freq[node.symbol] = node.freq;
            }
            traverse(node.left);
            traverse(node.right);
        }

        traverse(tree);
        return freq;
    }

    const headerObject = {
        literalFreq: extractFreq(literalTree),
        lengthFreq: extractFreq(lengthTree),
        distanceFreq: extractFreq(distanceTree),
        padding
    };

    const headerJSON = JSON.stringify(headerObject);
    const headerBuffer = Buffer.from(headerJSON);



    const headerLengthBuffer = Buffer.alloc(4);
    headerLengthBuffer.writeUInt32BE(headerBuffer.length);



    const finalBuffer = Buffer.concat([
        headerLengthBuffer,
        headerBuffer,
        dataBuffer
    ]);

    fs.writeFileSync(outputPath, finalBuffer);

    console.log("Compression file written successfully ✅");
}

module.exports = compress;