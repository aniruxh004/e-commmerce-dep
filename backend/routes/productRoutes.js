
require("dotenv").config()
const express = require("express");
const path = require("path");
const multer = require("multer");
const { getProducts, addProduct } = require("../controllers/productController");
const { verifyUser, isAdmin } = require("../Middleware/auth");
const cloudinary=require("cloudinary").v2
const {CloudinaryStorage}=require("multer-storage-cloudinary")


const Router = express.Router();

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const storage=new CloudinaryStorage({
 cloudinary:cloudinary,
 params:{
  folder:'oasis_products',
  format:async(req,file)=>'png',
  public_id:(req,file)=>`${req.body.name}-${Date.now()}`
 }
})



const upload = multer({ storage: storage });

// Routes
Router.get("/", getProducts);
Router.post("/add-product", verifyUser, isAdmin, upload.single("imageUrl"), addProduct);

module.exports = Router;