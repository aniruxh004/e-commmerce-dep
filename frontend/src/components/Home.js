// src/components/ProductsPage.js
import React, { useState, useEffect, useContext } from 'react';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import CartSidebar from './CartSidebar';
import './ProductsPage.css';
import ProductModal from './productModal';
import { AuthContext } from '../context/AuthContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const[selectedProduct,setSelectedProduct]=useState(null)
    const {user}=useContext(AuthContext)

  useEffect(() => {
    fetchProducts();
   }, [searchQuery, sortOrder, categoryFilter]);


   useEffect(()=>{
    if(user){
      fetchCart()
    }
   },[user])
   
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {

      const query=new URLSearchParams({
         search: searchQuery,
          sort: sortOrder,
         category: categoryFilter,
      }).toString()

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products${query?"?"+query:""}`);
     
      if(!res.ok){
        throw new Error("Failed to fetch products")
      }
       const data=await res.json()
      setProducts(data);

    } catch (err) {
      setError('Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCart=async()=>{
 try {
    const token=localStorage.getItem('token');
      if(!token){
        console.error("No token found. Cannot fetch cart.");
        return;
    }

    const res=await fetch(`${process.env.REACT_APP_API_URL}/api/cart/get-cart`,{
     headers:{
       'Authorization':`Bearer ${token}`
    }
    })
    const data=await res.json()
    setCart(data.Items||[])
 } catch (error) {
  console.error("Failed to fetch cart")
  setCart([])
 }
  }

  const handleAddToCart = async(product) => {

try {
   const token=localStorage.getItem('token');
   
   if(!token){
    alert("login to add to cart")
    return
   }
  
   const result=await fetch(`${process.env.REACT_APP_API_URL}/api/cart/addtoCart`,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
       'Authorization':`Bearer ${token}`
    },
    body:JSON.stringify({
      productId:product._id,
      quantity:product.quantity||1,
      size:product.selectedSize,
    })
   })
  
   if(!result.ok){
    const errorData=await result.json()
    throw new Error(errorData.msg||"Failed to add to cart")
   }
  
   const updatedCart=await result.json();
  
   setCart(updatedCart.Items)
  
} catch (error) {
  alert(error.message)
}
  }

  return (
    <div className="page-layout">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        onCartIconClick={() => setIsCartOpen(true)}
      />
      <main className="main-products-grid">
        {loading ? (
          <p className="status-message">Loading products...</p>
        ) : error ? (
          <p className="status-message error-message">{error}</p>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <ProductCard 
                key={product._id} 
                product={product}
                onAddToCart={() => handleAddToCart({...product,quantity:1,selectedSize:'M'})} 
                onProductClick={() => setSelectedProduct(product)} // 

              />
            ))}
          </div>
        )}
      </main>
      <CartSidebar 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        setCart={setCart}
      />

       {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}

