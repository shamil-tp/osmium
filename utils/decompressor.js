const fs = require('fs');

const EOF_SYMBOL = 256;

const decompress = (inputPath, outputPath) => {

    const fileBuffer = fs.readFileSync(inputPath);

    // Read header
    const headerLength = fileBuffer.readUInt32BE(0);
    const headerJSON   = fileBuffer.slice(4, 4 + headerLength).toString();
    const header       = JSON.parse(headerJSON);

    const { literalCodes, lengthCodes, distanceCodes, padding } = header;

    // Build reverse-lookup tables  code -> symbol
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
    const compressedSize = fs.statSync(inputPath).size;
    console.log('Decompression successful.');
    
    return {
        compressedSize,
        decompressedSize: output.length
    };
};

module.exports = decompress;
