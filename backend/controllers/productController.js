
const Product = require("../models/products");


const addProduct=async(req,res)=>{
try {
  if(!req.file){
    return res.status(400).json({msg:"No file uploaded"})
  }
  const {name,description,price,category,stock}=req.body;

  

  const imageUrl=req.file.path


  const newProduct=new Product(
    { name,
      description,
      price,
      category,
      stock,
      imageUrl
    }
  )
  await newProduct.save()
  res.status(200).json(newProduct)



} catch (error) {
  res.status(500).json({ msg: 'Server error' });
}
}

const getProducts=async(req,res)=>{
 try {
     const {search,sort,category}=req.query;
     
     let query={}
     let sortOption={}
   
     if(search){
       query.$or=[
         {name:{$regex:search,$options:'i'}},
         {description:{$regex:search,$options:'i'}}
       ]
     }
     if(category){
       query.category=category
     }
   
     if(sort){
       if(sort==='priceAsc')sortOption.price=1
       if(sort==='priceDesc')sortOption.price=-1
       if(sort==='nameAsc')sortOption.name=1
       if(sort==='nameDesc')sortOption.name=-1
     }
      
     const products=await Product.find(query).sort(sortOption)
     res.json(products)
 } catch (error) {
     res.status(500).json({msg:"server error"})
 }
}


module.exports={
    getProducts,
    addProduct
}
