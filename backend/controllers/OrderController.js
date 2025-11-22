const Order = require('../models/Orders');
const PendingOrder = require('../models/PendingOrder');
const Cart = require('../models/Cart');
const { Cashfree } = require('cashfree-pg');
const axios = require('axios');


const createOrder = async (req, res) => {
  const { shippingAddress, contact } = req.body;

  try {
    // ENV validation
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
      console.error("Cashfree keys missing");
      return res.status(500).json({ msg: "Server config error" });
    }

    // Input validation
    if (!contact) return res.status(400).json({ msg: "Phone number missing" });

    // Fetch cart using cart.Items
    const cart = await Cart.findOne({ userId: req.user._id }).populate("Items.productId");
    if (!cart || !cart.Items || cart.Items.length === 0) {
      return res.status(400).json({ msg: "Cart empty" });
    }

    const cartItems = cart.Items;

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = Number(item.productId?.price ?? 0);
      return sum + price * Number(item.quantity ?? 1);
    }, 0);

    if (totalAmount <= 0) {
      return res.status(400).json({ msg: "Invalid cart total" });
    }

    const orderAmountStr = totalAmount.toFixed(2);
    const orderId = "order_" + Date.now();

    const payload = {
      order_id: orderId,
      order_amount: orderAmountStr,
      order_currency: "INR",
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_email: req.user.email,
        customer_phone: contact,
      },
      order_meta: {
        return_url: `${req.protocol}://${req.get("host")}/payment-confirmation`,
        notify_url: process.env.PUBLIC_WEBHOOK_BASE_URL || "",
      },
    };

    // ==========================================
    // 1️⃣ FALLBACK: Raw Axios Request (WORKING & STABLE)
    // ==========================================

    const env = (process.env.CASHFREE_ENV || "TEST").toUpperCase();
    const baseURL =
      env === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const headers = {
      "Content-Type": "application/json",
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
      "x-api-version": process.env.CASHFREE_API_VERSION
    };

    console.log(
      `Calling Cashfree ${env} → ${baseURL}/orders with API version 2022-09-01`
    );

    const cfResp = await axios.post(`${baseURL}/orders`, payload, { headers });

    const cashfreeOrder = cfResp.data;

    console.log("Cashfree Order Response:", cashfreeOrder);

    const sessionId =
      cashfreeOrder?.payment_session_id ||
      cashfreeOrder?.order_token ||
      null;

    if (!sessionId) {
      return res.status(502).json({
        msg: "Cashfree responded but missing session_id",
        raw: cashfreeOrder,
      });
    }

    // Save pending order
    const pendingOrder = await PendingOrder.create({
      userId: req.user._id,
      Items: cartItems.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        quantity: item.quantity,
        size: item.size,
      })),
      shippingAddress,
      totalAmount: Number(orderAmountStr),
      paymentStatus: "pending",
      cashfreeOrderId: orderId,
      paymentSessionId: sessionId,
    });

    return res.json({
      payment_session_id: sessionId,
      order_id: orderId,
      pendingOrderId: pendingOrder._id,
    });
  } catch (error) {
    console.error("Cashfree ERROR:", error.message);
    console.error("Full:", error.response?.data);

    return res.status(500).json({
      msg: "Failed to create Cashfree order",
      error: error.response?.data || error.message,
    });
  }
};


const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")  
      .populate("Items.productId", "name price imageUrl"); // populate product name & price

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Failed to fetch orders" });
  }
};


const userOrders=async(req,res)=>{
try {
     
    const orders = await Order.find({ userId: req.user._id }) 
      .populate("Items.productId", "name price imageUrl")
      .sort({ createdAt: -1 });
    

    res.json(orders);
  } catch (error) {
    console.error(error)
    res.status(400).json({msg:'Internal server error'})
  }
}

module.exports = {
  createOrder,
  getAllOrders,
  userOrders
};


  
    
