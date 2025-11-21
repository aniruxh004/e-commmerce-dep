// const express=require("express")
// const { verifyUser } = require("../Middleware/auth")
// const { createOrder } = require("../controllers/OrderController")
// const Router=express.Router()

// Router.post('/create-order',verifyUser,createOrder)

// module.exports=Router









const express = require('express');
const { verifyUser, isAdmin } = require("../Middleware/auth");
const { createOrder, getAllOrders, userOrders } = require("../controllers/OrderController");
const Router = express.Router();

console.log("Order routes loaded");

// Test route
Router.get('/test', (req, res) => {
  res.send('Order routes are working!');
});

Router.post('/create-order', verifyUser, createOrder);
Router.get('/all', verifyUser, isAdmin, getAllOrders);
Router.get('/myOrders', verifyUser,userOrders);

module.exports = Router;
