const Order = require('../models/Orders');
const PendingOrder = require('../models/PendingOrder');
const Cart = require('../models/Cart');
const { Cashfree } = require('cashfree-pg');
const axios = require('axios');

const createOrder = async (req, res) => {
  const { shippingAddress, contact } = req.body;

  try {
    // ENV checks
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
      console.error("FATAL CONFIG: CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET missing");
      return res.status(500).json({ msg: 'Configuration Error: Missing Cashfree credentials.' });
    }

    // Basic input validation
    if (!contact || typeof contact !== 'string') {
      return res.status(400).json({ msg: 'Invalid contact phone number.' });
    }

    // Fetch cart and ensure Items is populated
    const cart = await Cart.findOne({ userId: req.user._id }).populate('Items.productId');

    if (!cart) {
      return res.status(400).json({ msg: 'Cart not found' });
    }

    // MUST use cart.Items as requested
    const cartItems = Array.isArray(cart.Items) ? cart.Items : [];
    if (cartItems.length === 0) {
      return res.status(400).json({ msg: 'Cart is empty' });
    }

    // Compute total using cart.Items (defensive)
    const total = cartItems.reduce((sum, item) => {
      const price = Number(item.productId?.price ?? item.price ?? 0);
      const qty = Number(item.quantity ?? 1);
      return sum + price * qty;
    }, 0);

    if (total <= 0) {
      return res.status(400).json({ msg: 'Cart total is zero or invalid' });
    }

    const orderAmountStr = total.toFixed(2);
    const orderId = `order_${Date.now()}`;

    const payload = {
      order_id: orderId,
      order_amount: orderAmountStr,
      order_currency: 'INR',
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_email: req.user.email,
        customer_phone: contact,
      },
      order_meta: {
        return_url: `${req.protocol}://${req.get('host')}/payment-confirmation`,
        notify_url: process.env.PUBLIC_WEBHOOK_BASE_URL || '',
      },
    };

    // === Try multiple SDK shapes, fallback to raw HTTP if needed ===
    let cashfreeOrder = null;

    try {
      // Attempt to construct an instance (some versions support constructor)
      let sdkInstance = null;
      try {
        // Many versions expose constants for env; attempt common constructor shapes
        if (typeof Cashfree === 'function') {
          // try constructor with object (some versions)
          try {
            sdkInstance = new Cashfree({
              clientID: process.env.CASHFREE_CLIENT_ID,
              clientSecret: process.env.CASHFREE_CLIENT_SECRET,
              env: process.env.CASHFREE_ENV === 'PROD' ? 'PROD' : 'TEST',
            });
          } catch (inner) {
            // fallback to other constructor signatures
            try {
              // e.g., new Cashfree(Cashfree.SANDBOX, id, secret)
              sdkInstance = new Cashfree(Cashfree.SANDBOX || 'TEST', process.env.CASHFREE_CLIENT_ID, process.env.CASHFREE_CLIENT_SECRET);
            } catch (e) {
              sdkInstance = null;
            }
          }
        }

        // Log SDK high-level shape for debugging (remove/turn off in prod)
        console.info('Cashfree top-level keys:', Object.keys(Cashfree || {}), 'sdkInstance keys:', sdkInstance ? Object.keys(sdkInstance) : null);

        // 1) Try documented static helper (common in v5+): Cashfree.PGCreateOrder(...)
        if (typeof Cashfree.PGCreateOrder === 'function') {
          const resp = await Cashfree.PGCreateOrder(payload);
          cashfreeOrder = resp?.data ?? resp;
        }
        // 2) Try instance method PGCreateOrder on sdkInstance
        else if (sdkInstance && typeof sdkInstance.PGCreateOrder === 'function') {
          const resp = await sdkInstance.PGCreateOrder(payload);
          cashfreeOrder = resp?.data ?? resp;
        }
        // 3) Try old style .orders.create if available (your original shape)
        else if (sdkInstance && sdkInstance.orders && typeof sdkInstance.orders.create === 'function') {
          const resp = await sdkInstance.orders.create(payload);
          cashfreeOrder = resp?.data ?? resp;
        }
        // 4) Try other static names that some forks use
        else if (typeof Cashfree.createOrder === 'function') {
          const resp = await Cashfree.createOrder(payload);
          cashfreeOrder = resp?.data ?? resp;
        }
        // 5) FALLBACK: raw HTTP POST to Cashfree Orders API (works regardless of SDK)
        else {
          console.warn('Cashfree SDK shape not detected; falling back to raw HTTP POST to Cashfree Orders API.');
          const base = (process.env.CASHFREE_ENV && process.env.CASHFREE_ENV.toUpperCase() === 'PROD')
            ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
          const url = `${base}/orders`;
          const headers = {
            'Content-Type': 'application/json',
            'x-client-id': process.env.CASHFREE_CLIENT_ID,
            'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
          };
          const r = await axios.post(url, payload, { headers });
          cashfreeOrder = r.data;
        }
      } catch (innerErr) {
        // Log SDK/fetch problem, then rethrow to outer catch
        console.error('Error while invoking Cashfree SDK or API:', innerErr?.message || innerErr);
        if (innerErr.response) console.error('Cashfree response:', innerErr.response.data || innerErr.response);
        throw innerErr;
      }
    } catch (sdkErr) {
      // bubble up to outer catch to return 500
      throw sdkErr;
    }

    console.info('cashfreeOrder (raw):', JSON.stringify(cashfreeOrder));

    // extract common fields defensively
    const cfOrderId =
      cashfreeOrder?.order_id ||
      cashfreeOrder?.data?.order_id ||
      cashfreeOrder?.orderId ||
      cashfreeOrder?.id ||
      null;

    const cfPaymentSessionId =
      cashfreeOrder?.payment_session_id ||
      cashfreeOrder?.data?.payment_session_id ||
      cashfreeOrder?.order_token ||
      cashfreeOrder?.paymentSessionId ||
      null;

    if (!cfOrderId || !cfPaymentSessionId) {
      console.error('Unexpected Cashfree response shape:', cashfreeOrder);
      return res.status(502).json({ msg: 'Payment provider returned unexpected response.' });
    }

    // Create pending order using cart.Items specifically
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

    // Optionally: lock/clear cart here if desired
    // await Cart.findByIdAndUpdate(cart._id, { Items: [], items: [] });

    // Return needed session details to client
    return res.json({
      payment_session_id: cfPaymentSessionId,
      order_id: cfOrderId,
      pendingOrderId: pendingOrder._id,
    });
  } catch (error) {
    console.error('CRASH IN CREATE ORDER:', error?.message || error);
    console.error(error?.stack);
    if (error.response) console.error('Cashfree error response:', JSON.stringify(error.response.data || error.response));
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


  
    
