require('dotenv').config()

const express = require('express');
const multer = require('multer');
const upload = multer({dest:'uploads/'})
const extractor = require('./extractor')
const app = express()

const port = process.env.PORT || 3000

app.set("view engine","ejs")
app.set("views","views")

app.use(express.urlencoded({extended:true}))


app.get('/',(req,res)=>res.render("started"))
app.get('/compress',(req,res)=>res.render("compress", {
    originalSize: " ",
    compressedSize: " ",
    sizeDifference: " ",
    compressionPercentage: " ",
    downloadUrl: null
}))
app.post('/compress',upload.single('file'),async (req,res)=>{
    console.log(req.file)
    const fileDetails = req.file
    
    let result = await extractor(fileDetails,'c')

    console.log(result)
    return res.redirect('/compress')
})
app.get('/decompress',(req,res)=>res.render("decompress",{downloadUrl:""}))
app.post('/decompress',upload.single('file'),async (req,res)=>{
    console.log(req.file)
    const fileDetails = req.file
    
    let result = await extractor(fileDetails,'d')

    console.log(result)
    return res.redirect('/compress')
})
app.listen(port)
