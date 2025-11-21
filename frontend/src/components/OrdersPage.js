import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./OrderPage.css"
const OrdersPage = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;  // Wait for user info to be available

    if (user.role === "admin") {
      const fetchOrders = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get("http://localhost:5000/api/orders/all", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setOrders(response.data);
          setLoading(false);
        } catch (err) {
          setError("Failed to load orders.");
          setLoading(false);
        }
      };
      fetchOrders();
    } else {
      setLoading(false);
      setError("Access Denied. Admins only.");

    

    }
  }, [user]);

  if (!user) return <p>Loading user info...</p>;
  if (loading) return <p>Loading orders...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="order-page-container">
      <h2 className="page-title">All Orders</h2>
      {orders.length === 0 ? (
        <p className="no-orders-message">No orders found.</p>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <p><strong>Order ID:</strong> {order._id}</p>
                <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="order-details">
                <p><strong>User:</strong> {order.userId?.name || "Unknown"} ({order.userId?.email || "N/A"})</p>
                <p><strong>Total:</strong> ₹{order.totalAmount}</p>

                <div className="shipping-address">
                  {order.shippingAddress ? (
                    <>
                      <p><strong>Street:</strong> {order.shippingAddress.street}</p>
                      <p><strong>City:</strong> {order.shippingAddress.city}</p>
                      <p><strong>State:</strong> {order.shippingAddress.state}</p>
                      <p><strong>Postal Code:</strong> {order.shippingAddress.postalCode}</p>
                      <p><strong>Country:</strong> {order.shippingAddress.country}</p>
                      <p><strong>Contact:</strong> {order.shippingAddress.contact}</p>
                    </>
                  ) : (
                    <p>Address not provided.</p>
                  )}
                </div>
              </div>
              <div className="order-items">
                {order.Items.map((item) => (
                  <div key={item.productId._id} className="order-item-card">
                    <img src={item.productId.imageUrl} alt={item.name} className="order-item-image" />
                    <div className="order-item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-details">Qty: {item.quantity} | Size: {item.size}</p>
                      <p className="item-price">₹{item.price}</p>
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
};

export default OrdersPage;
