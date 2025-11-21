
// src/components/ProductCard.js
import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart,onProductClick}) {
  return (
    <div className="product-card-container" onClick={onProductClick}>
      <img src={product.imageUrl} alt={product.name} className="product-image" />
      <div className="product-details">
        <div className="product-info-top">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">₹{product.price.toFixed(2)}</p>
        </div>
        <button className="add-to-cart-icon-button" onClick={(e) => { e.stopPropagation(); onAddToCart(e); }}>
          <FaShoppingCart />
        </button>
      </div>
    </div>
  );
}