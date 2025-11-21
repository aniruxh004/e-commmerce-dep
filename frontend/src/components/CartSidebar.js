// src/components/CartSidebar.js
import './CartSidebar.css';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CartSidebar({ isCartOpen, setIsCartOpen, cart, setCart }) {

  const navigate=useNavigate();
  const HandleQuantityChange = async(cartId, newQuantity) => {

      if (newQuantity <= 0) {
        HandleRemoveFromCart(cartId);
      }
      

    setCart(prevCart => (
       prevCart.map(item =>
        item._id === cartId ? { ...item, quantity: newQuantity } : item
      )
    ))
    
    try {
       const token=localStorage.getItem('token')
      const res=await fetch(`${process.env.REACT_APP_API_URL}/api/cart/update`,{
        method:"PUT",
        headers:{
          'Content-Type':"application/json",
          'Authorization':`Bearer ${token}`
        },
        body:JSON.stringify({
          cartId,
          quantity:newQuantity
        })

      
      })
        const updated=await res.json()
        setCart(updated.Items)
      
    } catch (error) {
      console.error("failed to update cart",error)
    }
    
  }
    const HandleRemoveFromCart=async(cartId)=>{
     setCart(prevCart => prevCart.filter(item => item._id !== cartId));
     
    

     try {
       const token=localStorage.getItem('token')
       const res=await fetch(`${process.env.REACT_APP_API_URL}/api/cart/${cartId}`,{
         method:'DELETE',
         headers:{
           'Content-Type':'application/json',
           'Authorization':`Bearer ${token}`
         }
           })
           if(!res.ok){
            throw new Error("Failed to add items to cart")
           }

           const updated = await res.json();
           setCart(updated.Items);

     } catch (error) {
      console.error("Failed to remove from cart")
     }
    }
    
    
  
   const cartTotal = cart?.reduce((total, item) => {
  if (item.productId && item.productId.price) {
    return total + item.productId.price * item.quantity;
  }
  return total;
}, 0)?.toFixed(2) || "0.00";
  

const handleCheckout=()=>{
  setIsCartOpen(false)
  navigate('/checkout')
}
  return (
    <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
      <div className="cart-header">
        <h3>Shopping Cart</h3>
        <button onClick={() => setIsCartOpen(false)} className="close-cart-button">&times;</button>
      </div>
      <div className="cart-items">
        {!cart || cart.length === 0? (
          <p className="empty-cart-message">Your cart is empty.</p>
        ) : (
          cart.map(item => (
            <div key={item._id} className="cart-item">
              <img src={item.productId.imageUrl} alt={item.name} className="cart-item-image" />
              <div className="cart-item-info">
                <h4>{item.productId.name}</h4>
                <p>₹{typeof item.productId.price === 'number' ? item.productId.price.toFixed(2) : item.productId.price}</p>
                <p>Size: {item.size}</p> 
                <div className="quantity-controls">
                  <button  disabled={item.quantity === 1}  onClick={() => HandleQuantityChange(item._id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button disabled={item.quantity===10} onClick={() => HandleQuantityChange(item._id, item.quantity + 1)}>+</button>
                  <button  className="remove-btn" onClick={() => HandleRemoveFromCart(item._id)}>Remove</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="cart-footer">
        <div className="cart-total-display">
          <span>Total:</span>
          <span className="total-amount">₹{cartTotal}</span>
        </div>
        <button onClick={handleCheckout} className="checkout-button">Proceed to Checkout</button>
      </div>
    </div>
  );
}
