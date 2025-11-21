const Order = require('../models/Orders');
const PendingOrder = require('../models/PendingOrder');
const Cart = require('../models/Cart');
const { Cashfree } = require('cashfree-pg'); // Ensure this is imported

const createOrder = async (req, res) => {
    const { shippingAddress, contact } = req.body;
    try {
        // --- CRITICAL FIX: Initialize Cashfree inside the try block ---
        // This guarantees that the process.env variables are already loaded.
        const cashfreeInstance = new Cashfree(
            process.env.CASHFREE_CLIENT_ID,
            process.env.CASHFREE_CLIENT_SECRET,
            'TEST', // Use 'TEST' for sandbox mode
            '2022-09-01' // Your API version
        );
        // -------------------------------------------------------------

        // 1. Fetch Cart Data
        const cart = await Cart.findOne({ userId: req.user._id }).populate('Items.productId'); 

        if (!cart || cart.Items.length === 0) {
            return res.status(400).json({ msg: 'Cart is empty' });
        }
        
        // 2. Calculate Total Amount (in Rupees)
        const totalAmountInRupees = cart.Items.reduce(
            (sum, item) => sum + (item.productId?.price || 0) * item.quantity,
            0
        );

        // 3. CASHFREE ORDER CREATION
        const cashfreeOrder = await cashfreeInstance.orders.create({
            order_id: "order_" + Date.now(),
            order_amount: totalAmountInRupees,
            order_currency: 'INR',
            customer_details: {
                customer_id: req.user._id.toString(),
                customer_email: req.user.email,
                customer_phone: contact,
            },
            order_meta: {
                return_url: `${req.protocol}://${req.get('host')}/payment-confirmation`,
                notify_url: `${process.env.PUBLIC_WEBHOOK_BASE_URL}`,
            }
        });

        // 4. CREATE PENDING ORDER (The Lock)
        await PendingOrder.create({
            userId: req.user._id,
            Items: cart.Items.map(item => ({
                productId: item.productId._id,
                name: item.productId.name,
                price: item.productId.price,
                quantity: item.quantity,
                size: item.size
            })),
            shippingAddress,
            totalAmount: totalAmountInRupees,
            paymentStatus: 'pending',
            cashfreeOrderId: cashfreeOrder.order_id,
            paymentSessionId: cashfreeOrder.payment_session_id
        });

        // 5. RESPOND WITH SESSION ID
        res.json({
            payment_session_id: cashfreeOrder.payment_session_id,
            order_id: cashfreeOrder.order_id,
        });

    } catch (error) {
        console.error('CRASH IN CREATE ORDER:', error.message);
        console.error('Cashfree Error Details:', error.response?.data); 
        return res.status(500).json({ msg: 'Server error: Failed to create Cashfree order.' });
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


  
    
