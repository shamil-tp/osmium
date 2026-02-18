require('dotenv').config()

const express = require('express');
const app = express()

const port = process.env.PORT || 3000

app.set("view engine","ejs")
app.set("views","views")

app.use(express.urlencoded({extended:true}))

app.get('/',(req,res)=>res.render("started"))
app.get('/compress',(req,res)=>res.render("compress", {
    originalSize: "4.5 MB",
    compressedSize: "1.2 MB",
    sizeDifference: "3.3 MB",
    compressionPercentage: "73%",
    downloadUrl: "/downloads/file.zip"
}))

app.listen(port)