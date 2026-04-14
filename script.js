const fs = require('fs');
const fileBuffer = fs.readFileSync('index_fixed.bin');
const headerLength = fileBuffer.readUInt32BE(0);
const headerJSON = fileBuffer.slice(4, 4+headerLength).toString();
const zlib = require('zlib');
const z = zlib.deflateSync(Buffer.from(headerJSON));
console.log('Original Header JSON Size:', headerJSON.length);
console.log('Zlib Header Size:', z.length);
