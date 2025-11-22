const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const path=require("path")
const PORT = process.env.PORT || 5000;

dotenv.config();
connectDB();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL||'http://localhost:3000';

app.use(cors({
  origin: allowedOrigin,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow all necessary HTTP methods
  // CRITICAL FIX: Explicitly allow the Authorization header
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true,
}));
app.use(express.json());
app.post(
  '/webhooks/cashfree',                      
  express.raw({ type: 'application/json' }), 
  require('./webhooks/cashfreeWebhook')     
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.use('/api/cart', cartRoutes);
app.use('/api/orders',orderRoutes);


app.use('/uploads',express.static(path.join(__dirname,'uploads')))



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
