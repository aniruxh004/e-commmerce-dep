const Cart = require("../models/Cart");
const Order = require("../models/orders");

const axios = require("axios");
const PendingOrder = require("../models/PendingOrder");

const createOrder = async (req, res) => {
  const { shippingAddress, contact } = req.body;
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('Items.productId');
    // console.log(cart?.Items);

    if (!cart || cart.Items.length === 0) {
      return res.status(400).json({ msg: 'Cart is empty' });
    }

    const totalAmount = cart.Items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    console.log("Webhook base URL:", process.env.PUBLIC_WEBHOOK_BASE_URL);

    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_amount: totalAmount, // replace with req.body.amount if dynamic
        order_currency: "INR",
        order_id: "order_" + Date.now(),
        customer_details: {
          customer_id: req.user._id.toString(),
          customer_email: req.user.email,
          customer_phone: contact,
        },
         order_meta: {
          return_url: "http://localhost:3000/payment-confirmation",
          notify_url: `${process.env.PUBLIC_WEBHOOK_BASE_URL}/webhook/cashfree` // optional per-order notify
        }
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
          "x-api-version": "2022-09-01",
          "Content-Type": "application/json",
        },
      }
    );

    const cashfreeOrder = response.data;

    await  PendingOrder.create({
      userId: req.user._id,
      Items: cart.Items.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        quantity: item.quantity,
        size: item.size
      })),
      shippingAddress,
      totalAmount,
      paymentStatus: 'pending',
      cashfreeOrderId: cashfreeOrder.order_id,
      paymentSessionId: cashfreeOrder.payment_session_id
    });


    res.json({
      payment_session_id: cashfreeOrder.payment_session_id,
      order_id: cashfreeOrder.order_id,
    });



  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'server error' });
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


  
    