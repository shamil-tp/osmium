const fs = require('fs').promises;
const path = require('path');
const comi = require('./compress')
const dcomi = require('./decompressor')

const extractor = async(file, dir, char) => {
    let fileDetails = file;
    const inputPath = path.join(dir, 'uploads', fileDetails.filename);
    let result = {};
    let outputFilename = '';

    if (char === 'c') {
        outputFilename = fileDetails.originalname + '.bin';
        const outputPath = path.join(dir, 'uploads', outputFilename);
        result = await comi(inputPath, outputPath);
        result.downloadFilename = outputFilename;
    } else if (char === 'd') {
        outputFilename = fileDetails.originalname.replace('.bin', '');
        if (outputFilename === fileDetails.originalname) outputFilename += '.txt';
        const outputPath = path.join(dir, 'uploads', outputFilename);
        result = await dcomi(inputPath, outputPath);
        result.downloadFilename = outputFilename;
    }

    try {
        await fs.access(inputPath);
        await fs.unlink(inputPath);
        console.log('Original file deleted successfully');
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error deleting file:', err);
        }
    }

    return result;
}

module.exports = extractor