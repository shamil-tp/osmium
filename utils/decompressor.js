const fs = require("fs");

function decompress(inputPath, outputPath) {

    const fileBuffer = fs.readFileSync(inputPath);


    const headerLength = fileBuffer.readUInt32BE(0);


    const headerStart = 4;
    const headerEnd = 4 + headerLength;

    const headerJSON = fileBuffer.slice(headerStart, headerEnd).toString();
    const header = JSON.parse(headerJSON);

    const { literalFreq, lengthFreq, distanceFreq, padding } = header;


    function buildTree(freqObj) {

        const entries = Object.entries(freqObj);
        if (entries.length === 0) return null;

        let nodes = entries.map(([symbol, freq]) => ({
            symbol: isNaN(symbol) ? symbol : Number(symbol),
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

    const literalTree = buildTree(literalFreq);
    const lengthTree = buildTree(lengthFreq);
    const distanceTree = buildTree(distanceFreq);


    const dataBuffer = fileBuffer.slice(headerEnd);

    let bitString = "";

    for (let byte of dataBuffer) {
        bitString += byte.toString(2).padStart(8, "0");
    }


    if (padding > 0) {
        bitString = bitString.slice(0, -padding);
    }


    let i = 0;
    const outputBytes = [];

    function decodeSymbol(tree) {
        let node = tree;

        while (node.symbol === null) {
            if (bitString[i++] === "0") {
                node = node.left;
            } else {
                node = node.right;
            }
        }

        return node.symbol;
    }

    while (i < bitString.length) {

        const marker = bitString[i++];

        if (marker === "0") {

            const byte = decodeSymbol(literalTree);
            outputBytes.push(byte);

        } else {

            const length = decodeSymbol(lengthTree);
            const distance = decodeSymbol(distanceTree);

            const start = outputBytes.length - distance;

            for (let j = 0; j < length; j++) {
                outputBytes.push(outputBytes[start + j]);
            }
        }
    }


    const outputBuffer = Buffer.from(outputBytes);
    fs.writeFileSync(outputPath, outputBuffer);

    const compressedSize = fs.statSync(inputPath).size;
    const decompressedSize = outputBuffer.length;

    console.log("Decompression successful ✅");
    return {
        compressedSize,
        decompressedSize
    };
}

module.exports = decompress;