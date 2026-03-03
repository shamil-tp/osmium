require('dotenv').config()

const express = require('express');
const multer = require('multer');
const upload = multer({dest:'uploads/'})
const extractor = require('./utils/extractor')
const app = express()

const port = process.env.PORT || 3002

app.set("view engine","ejs")
app.set("views","views")

app.use(express.urlencoded({extended:true}))


app.get('/',(req,res)=>res.render("started"))

app.get('/compress', (req, res) => res.render("compress", {
    originalSize: null,
    compressedSize: null,
    savings: null,
    downloadUrl: null
}))
app.post('/compress', upload.single('file'), async (req, res) => {
    if (!req.file) return res.redirect('/compress');
    
    const result = await extractor(req.file, __dirname, 'c');
    
    res.render("compress", {
        originalSize: (result.originalSize / 1024).toFixed(2) + " KB",
        compressedSize: (result.compressedSize / 1024).toFixed(2) + " KB",
        savings: ((1 - result.compressedSize / result.originalSize) * 100).toFixed(2) + "%",
        downloadUrl: `/download/${result.downloadFilename}`
    });
})

app.get('/decompress', (req, res) => res.render("decompress", {
    compressedSize: null,
    decompressedSize: null,
    downloadUrl: null
}))
app.post('/decompress', upload.single('file'), async (req, res) => {
    if (!req.file) return res.redirect('/decompress');

    const result = await extractor(req.file, __dirname, 'd');

    res.render("decompress", {
        compressedSize: (result.compressedSize / 1024).toFixed(2) + " KB",
        decompressedSize: (result.decompressedSize / 1024).toFixed(2) + " KB",
        downloadUrl: `/download/${result.downloadFilename}`
    });
})

app.get('/download/:filename', (req, res) => {
    const filePath = require('path').join(__dirname, 'uploads', req.params.filename);
    res.download(filePath);
});
app.listen(port)
