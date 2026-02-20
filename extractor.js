const fs = require('fs').promises;
const path = require('path');
const compressor = require('./compressor')
const decompressor = require('./decompress')

// const extractor = async(fileDetails,g)=>{
//     const filename = fileDetails.filename
//     const filePath = path.join(__dirname,'uploads',filename)
//     const size = fileDetails.size
//     // const sizeInMb = size/Math.pow(1024,2)
//     let data
//     try{
//         data = await fs.readFile(filePath,'utf-8')
//     }catch(e){
//         console.log(e)
//     }
//     console.log("SIZE IN bytes : ",size)
    
//     if(g === 'c')compressor(data)
//     if(g === 'd')decompressor(data)

//     try{
//         await fs.access(filePath)
//         await fs.unlink(filePath)
//     }catch(e){
//         console.log(e)
//     }

//     return "file reading completed"

// }


const extractor = async(fileDetails,g)=>{
    const filename = fileDetails.filename
    const filePath = path.join(__dirname,'uploads',filename)
    const size = fileDetails.size

    console.log("SIZE IN bytes : ",size)

    if(g === 'c'){
        const data = await fs.readFile(filePath,'utf-8')
        compressor(data)
    }

    if(g === 'd'){
        decompressor(filePath)  // ✅ PASS PATH NOT DATA
    }

    try{
        await fs.unlink(filePath)
    }catch(e){
        console.log(e)
    }

    return "file reading completed"
}

module.exports = extractor
