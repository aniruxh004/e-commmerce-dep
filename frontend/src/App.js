








// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import ProtectedRoute from './components/ProtectedRoute'; // Import the new component
import ProductCard from './components/ProductCard';
import { AuthProvider } from './context/AuthContext';
import AddProductForm from './components/AddProduct';
import CheckoutPage from './components/CheckoutPage';
import OrdersPage from './components/OrdersPage';  // Import OrdersPage
import { PaymentConfirmation } from './components/confirmationPage';
import UserOrdersPage from './components/userOrderPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/add-product" element={<AddProductForm />} />
            <Route path="/orders" element={<OrdersPage />} />  {/* New route */}
            <Route path="/myOrders" element={<UserOrdersPage/>} />  

            <Route path="/productCard" element={<ProductCard />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-confirmation" element={<PaymentConfirmation/>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;








