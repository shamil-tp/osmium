const fs = require("fs");

const decompressor = (filePath) => {

    // -----------------------
    // 1️⃣ Read File
    // -----------------------
    console.log(filePath)
    let fileBuffer = fs.readFileSync(filePath);

    // Find where JSON header ends (newline)
    let newlineIndex = fileBuffer.indexOf(10); // '\n'

    let headerBuffer = fileBuffer.slice(0, newlineIndex);
    let dataBuffer = fileBuffer.slice(newlineIndex + 1);

    let header = JSON.parse(headerBuffer.toString());
    let frequency = header.frequency;
    let padding = header.padding;

    // -----------------------
    // 2️⃣ Rebuild Frequency Map
    // -----------------------
    let feq = new Map(Object.entries(frequency));

    // -----------------------
    // 3️⃣ Rebuild Huffman Tree
    // -----------------------
    let nodes = [...feq.entries()].map(([char, freq]) => ({
        char,
        freq,
        left: null,
        right: null
    }));

    if (nodes.length === 1) {
        nodes.push({
            char: null,
            freq: 0,
            left: null,
            right: null
        });
    }

    while (nodes.length > 1) {
        nodes.sort((a, b) => a.freq - b.freq);

        let left = nodes.shift();
        let right = nodes.shift();

        nodes.push({
            char: null,
            freq: left.freq + right.freq,
            left,
            right
        });
    }

    let root = nodes[0];

    // -----------------------
    // 4️⃣ Convert Binary to Bit String
    // -----------------------
    let bitString = "";

    for (let byte of dataBuffer) {
        bitString += byte.toString(2).padStart(8, "0");
    }

    // Remove padding
    if (padding > 0) {
        bitString = bitString.slice(0, -padding);
    }

    // -----------------------
    // 5️⃣ Decode Using Tree
    // -----------------------
    let decoded = "";
    let current = root;

    for (let bit of bitString) {
        if (bit === "0") {
            current = current.left;
        } else {
            current = current.right;
        }

        if (current.char !== null) {
            decoded += current.char;
            current = root;
        }
    }

    // -----------------------
    // 6️⃣ Write Output
    // -----------------------
    fs.writeFileSync("decompressed.txt", decoded);

    console.log("Decompression complete ✅");
};

module.exports = decompressor;