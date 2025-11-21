// src/components/UserOrdersPage.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './OrderPage.css'; // Reuse the admin page's CSS for consistency

export default function UserOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchOrders = async () => {
        setLoading(true);
        const token = localStorage.getItem('token'); // Get token directly

        
        if (!token) {
            setLoading(false);
            setError('Please log in to view your orders.'); 
            return;
        }
        
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/myOrders`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setOrders(res.data);
            console.log(orders)
            setError(null); // Clear any previous error
            
        } catch (err) {
            console.error("Order Fetch Error:", err);
            // Check for 401 error explicitly (token expired/invalid)
            const errorMsg = err.response?.data?.msg || 'Failed to fetch orders.';
            setError(errorMsg);
            setOrders([]); 
            
        } finally {
            setLoading(false); 
        }
    };
    
    
    fetchOrders(); 
}, [user]);

  if (loading) return <div className="order-page-container">Loading your orders...</div>;
  if (error) return <div className="order-page-container error-message">{error}</div>;

  return (
    <div className="order-page-container">
      <h2 className="page-title">My Order History</h2>
      {orders.length === 0 ? (
        <p className="no-orders-message">You have not placed any orders yet.</p>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${order.paymentStatus}`}>{order.paymentStatus}</span></p>
              </div>
              <div className="order-details">
                <p><strong>Order Total:</strong> ₹{order.totalAmount.toFixed(2)}</p>
              </div>
              <div className="order-items">
                {order.Items.map((item) => (
                  <div key={item.productId._id} className="order-item-card">
                    <img src={item.productId?.imageUrl} alt={item.name} className="order-item-image" />
                    <div className="order-item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-details">Qty: {item.quantity} | Size: {item.size}</p>
                      <p className="item-price">₹{item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
