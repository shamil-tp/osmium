// const fs = require('fs')

// const compressor = (data)=>{
//     const content = data
//     let arr = content.split('')





//     // console.log(arr)

//     // let huffmanArr =[]

//     // let i = 0
//     // while(arr.length>0){
//     //     let j = 1
//     //     let k = i
//     //     huffmanArr[i] = {letter:arr[i],iterations:j}
//     //     while(arr[k] === arr[k+1]){
//     //         huffmanArr[i].iterations++
//     //         k++
//     //     }
//     //     if(i !== k){
//     //         i = k
//     //     }else{
//     //         i++
//     //     }
//     // }
//     // console.log(huffmanArr)
    

//     // let lineCount = 0
//     // arr = arr.filter((a)=>{
//     //     if(a !=="\r" && a !== '\n'){
//     //         return true
//     //     }else{
//     //         lineCount++
//     //     }
//     // })

//     // let di = new Map

//     // let k = 0 
//     // //      NOTE: empty array are truthy
//     // while(arr.length > 0){
//     //     let temp = []
//     //     for(let i = 0;i<2;i++){
//     //         temp[i] = arr.shift()
//     //     }
//     //         temp = temp.join('')
//     //         di.set(k,temp)
//     //         k++
//     // }
//     // console.log(di)
//     // console.log(lineCount/2)

//     let feq = new Map
    
//     for(let c of arr){
//         // feq[c] = (feq[c] || 0) + 1
//         if(feq.has(c)){
//             feq.set(c,feq.get(c)+1)
//         }else{
//             feq.set(c,1)
//         }
//     }

//     if(feq.get('\r')===feq.get('\n')){
//         console.log("number of lines: "+feq.get('\r'))
//     }
//     console.log(feq)
//     let uniqueCharLength = feq.size

//     // let sortedFeq = [feq.entries]
//     // let sorted = [...feq.entries()].sort((a, b) => a[1] - b[1])
//     let nodes = [...feq.entries()].map(([char, freq]) => ({
//     char,
//     freq,
//     left: null,
//     right: null
// }));
// nodes.sort((a, b) => a.freq - b.freq);
// while (nodes.length > 1) {
//     // Sort
//     nodes.sort((a, b) => a.freq - b.freq);

//     // Take two smallest
//     let left = nodes.shift();
//     let right = nodes.shift();

//     // Create new parent node
//     let parent = {
//         char: null,
//         freq: left.freq + right.freq,
//         left: left,
//         right: right
//     };

//     // Add back to list
//     nodes.push(parent);
// }
// let root = nodes[0];
// let codes = {};

// function generateCodes(node, currentCode) {
//     if (!node) return;

//     // If leaf node
//     if (node.char !== null) {
//         codes[node.char] = currentCode;
//     }

//     generateCodes(node.left, currentCode + "0");
//     generateCodes(node.right, currentCode + "1");
// }

// generateCodes(root, "");
// let encoded = "";

// for (let char of arr) {
//     encoded += codes[char];
// }

// console.log(encoded);
// console.log(codes);
// // console.log(sorted)

//     console.log(arr)
//     let padding = 8 - (encoded.length % 8);
// if (padding !== 8) {
//     encoded += "0".repeat(padding);
// } else {
//     padding = 0;
// }
// let bytes = [];

// for (let i = 0; i < encoded.length; i += 8) {
//     let byte = encoded.slice(i, i + 8);
//     bytes.push(parseInt(byte, 2));
// }
// let buffer = Buffer.from(bytes);
// let header = {
//     frequency: Object.fromEntries(feq),
//     padding: padding
// };

// let headerString = JSON.stringify(header) + "\n";

// let finalBuffer = Buffer.concat([
//     Buffer.from(headerString),
//     buffer
// ]);

// fs.writeFileSync("compressed.bin", finalBuffer);
//     return
// }

// module.exports = compressor


const fs = require("fs");

const compressor = (data) => {
    if (!data || data.length === 0) {
        console.log("Empty file.");
        return;
    }

    // -----------------------
    // 1️⃣ Frequency Map
    // -----------------------
    let feq = new Map();

    for (let char of data) {
        feq.set(char, (feq.get(char) || 0) + 1);
    }

    // -----------------------
    // 2️⃣ Create Nodes
    // -----------------------
    let nodes = [...feq.entries()].map(([char, freq]) => ({
        char,
        freq,
        left: null,
        right: null
    }));

    // Edge case: if only one unique character
    if (nodes.length === 1) {
        nodes.push({
            char: null,
            freq: 0,
            left: null,
            right: null
        });
    }

    // -----------------------
    // 3️⃣ Build Huffman Tree
    // -----------------------
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
    // 4️⃣ Generate Codes
    // -----------------------
    let codes = {};

    const generateCodes = (node, currentCode) => {
        if (!node) return;

        if (node.char !== null) {
            codes[node.char] = currentCode || "0"; // single-char safety
        }

        generateCodes(node.left, currentCode + "0");
        generateCodes(node.right, currentCode + "1");
    };

    generateCodes(root, "");

    // -----------------------
    // 5️⃣ Encode Data
    // -----------------------
    let encoded = "";

    for (let char of data) {
        encoded += codes[char];
    }

    // -----------------------
    // 6️⃣ Padding
    // -----------------------
    let padding = (8 - (encoded.length % 8)) % 8;
    encoded += "0".repeat(padding);

    // -----------------------
    // 7️⃣ Convert to Bytes
    // -----------------------
    let bytes = [];

    for (let i = 0; i < encoded.length; i += 8) {
        bytes.push(parseInt(encoded.slice(i, i + 8), 2));
    }

    let buffer = Buffer.from(bytes);

    // -----------------------
    // 8️⃣ Header
    // -----------------------
    let header = {
        frequency: Object.fromEntries(feq),
        padding
    };

    let headerBuffer = Buffer.from(JSON.stringify(header) + "\n");

    // -----------------------
    // 9️⃣ Write File
    // -----------------------
    let finalBuffer = Buffer.concat([headerBuffer, buffer]);

    fs.writeFileSync("compressed.bin", finalBuffer);

    console.log("Compression complete ✅");
    return
};

module.exports = compressor;