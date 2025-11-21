
// export default ProductModal;

// src/components/ProductModal.js
import React, { useState } from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import './ProductModal.css';

const ProductModal = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M'); // Default selected size

  const availableSizes = ['S', 'M', 'L', 'XL']; // Example sizes

  const handleAddToCartClick = () => {
    // Pass selected size along with other product details
    onAddToCart({ ...product, quantity, selectedSize });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <div className="modal-body">
          <div className="modal-image-container">
            <img src={product.imageUrl} alt={product.name} className="modal-image" />
          </div>
          <div className="modal-details">
            <h2 className="modal-product-name">{product.name}</h2>
            <p className="modal-product-description">{product.description}</p>
            <div className="modal-price-size">
              <div className="size-selector">
                <label>Size:</label>
                <div className="size-buttons">
                  {availableSizes.map(size => (
                    <button
                      key={size}
                      className={`size-button ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <p className="modal-product-price">₹{product.price.toFixed(2)}</p>
            </div>
            <div className="modal-actions">
              <div className="quantity-control">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <button className="modal-add-to-cart-button" onClick={handleAddToCartClick}>
                <FaShoppingCart /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;