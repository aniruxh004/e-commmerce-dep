// src/components/CheckoutPage.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    contact: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingAddress: address, contact: address.contact }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.msg || 'Failed to create order');
      }

      if (!data || !data.payment_session_id) {
        setError("Payment session creation failed");
        return;
      }


      const cashfree = window.Cashfree({ mode: "sandbox" }); // use "production" later
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self" // or "_blank"
      });

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to checkout.</div>;
  }


  return (
    <div className="checkout-container">
      <h2>Shipping Information</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="street" placeholder="Street Address" value={address.street} onChange={handleChange} required />
        <input type="text" name="city" placeholder="City" value={address.city} onChange={handleChange} required />
        <input type="text" name="state" placeholder="State" value={address.state} onChange={handleChange} required />
        <input type="text" name="postalCode" placeholder="Postal Code" value={address.postalCode} onChange={handleChange} required />
        <input type="text" name="country" placeholder="Country" value={address.country} onChange={handleChange} required />
        <input type="text" name="contact" placeholder="9999999999" value={address.contact} onChange={handleChange} required />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
