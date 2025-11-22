const Order = require('../models/Orders');
const PendingOrder = require('../models/PendingOrder');
const Cart = require('../models/Cart');
const { Cashfree } = require('cashfree-pg');

const createOrder = async (req, res) => {
  const { shippingAddress, contact } = req.body;

  try {
    // --- ENV checks ---
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
      console.error("FATAL CONFIG ERROR: CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET is missing.");
      return res.status(500).json({ msg: 'Configuration Error: Missing Cashfree credentials in ENV.' });
    }
    if (!process.env.PUBLIC_WEBHOOK_BASE_URL) {
      console.warn("Warning: PUBLIC_WEBHOOK_BASE_URL not set - notify_url may be empty.");
    }

    // basic input validation
    if (!contact || typeof contact !== 'string') {
      return res.status(400).json({ msg: 'Invalid contact phone number.' });
    }

    const cashfreeInstance = new Cashfree({
      clientID: process.env.CASHFREE_CLIENT_ID,
      clientSecret: process.env.CASHFREE_CLIENT_SECRET,
      env: process.env.CASHFREE_ENV || 'TEST', // allow override via ENV
    });

    // Fetch cart - support either Items or items (defensive)
    const cart = await Cart.findOne({ userId: req.user._id }).populate('Items.productId')

    if (!cart) {
      return res.status(400).json({ msg: 'Cart not found' });
    }

    // Use whichever property exists (Items or items)
    const cartItems = Array.isArray(cart.Items) ? cart.Items : Array.isArray(cart.items) ? cart.items : [];

    if (cartItems.length === 0) {
      return res.status(400).json({ msg: 'Cart is empty' });
    }

    // compute total (ensure numbers and fallback to 0)
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = Number(item.productId?.price ?? item.price ?? 0);
      const qty = Number(item.quantity ?? 1);
      return sum + price * qty;
    }, 0);

    if (totalAmount <= 0) {
      return res.status(400).json({ msg: 'Cart total is zero — cannot create order.' });
    }

    // Many gateways expect a string with 2 decimals; use toFixed(2)
    const orderAmountStr = totalAmount.toFixed(2);

    // prepare payload (adjust fields if your SDK expects different names)
    const cashfreePayload = {
      order_id: `order_${Date.now()}`,
      order_amount: orderAmountStr,
      order_currency: 'INR',
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_email: req.user.email,
        customer_phone: contact,
      },
      order_meta: {
        return_url: `${req.protocol}://${req.get('host')}/payment-confirmation`,
        notify_url: process.env.PUBLIC_WEBHOOK_BASE_URL || '', // optional
      },
    };

    // Create Cashfree order - SDK may return different shapes (be defensive)
    const cashfreeOrder = await cashfreeInstance.orders.create(cashfreePayload);

    // DEBUG: log the whole response to inspect fields during dev (remove in prod or guard with env)
    console.info('Cashfree raw response:', JSON.stringify(cashfreeOrder));

    // extract values with fallback keys (different SDK versions return different shapes)
    const cfOrderId =
      cashfreeOrder?.order_id ||
      cashfreeOrder?.data?.order_id ||
      cashfreeOrder?.id ||
      cashfreeOrder?.orderId ||
      null;

    const cfPaymentSessionId =
      cashfreeOrder?.payment_session_id ||
      cashfreeOrder?.data?.payment_session_id ||
      cashfreeOrder?.paymentSessionId ||
      cashfreeOrder?.order_token ||
      null;

    if (!cfOrderId || !cfPaymentSessionId) {
      console.error('Unexpected Cashfree response structure:', cashfreeOrder);
      return res.status(502).json({ msg: 'Payment provider returned unexpected response.' });
    }

    // Create a pending order in DB
    const pendingOrder = await PendingOrder.create({
      userId: req.user._id,
      Items: cartItems.map((item) => ({
        productId: item.productId?._id ?? item.productId,
        name: item.productId?.name ?? item.name ?? '',
        price: Number(item.productId?.price ?? item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        size: item.size ?? item.selectedSize ?? null,
      })),
      shippingAddress,
      totalAmount: Number(orderAmountStr),
      paymentStatus: 'pending',
      cashfreeOrderId: cfOrderId,
      paymentSessionId: cfPaymentSessionId,
      createdAt: new Date(),
    });

    // Optionally clear or lock cart here (depends on your flow)
    // await Cart.findByIdAndUpdate(cart._id, { Items: [], items: [] });

    // Send back the session id and order id
    return res.json({
      payment_session_id: cfPaymentSessionId,
      order_id: cfOrderId,
      pendingOrderId: pendingOrder._id,
    });
  } catch (error) {
    // better error logging
    console.error('CRASH IN CREATE ORDER:', error?.message);
    console.error(error?.stack);
    if (error.response) {
      console.error('Cashfree error response:', JSON.stringify(error.response.data || error.response));
    }
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


  
    
