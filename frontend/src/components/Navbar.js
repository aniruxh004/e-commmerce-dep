
import React, { useState, useContext } from 'react';
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';
import oasis from "../assets/Images/oasis.png";

const Navbar = ({
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  categoryFilter,
  setCategoryFilter,
  onCartIconClick
}) => {
  const categories = ['T-Shirts', 'Hoodies', 'Jeans', 'Jackets', 'Shoes'];
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleProfileDropdown = () => setIsProfileDropdownOpen(!isProfileDropdownOpen);
  const toggleSortDropdown = () => setIsSortDropdownOpen(!isSortDropdownOpen);
  const toggleCategoryDropdown = () => setIsCategoryDropdownOpen(!isCategoryDropdownOpen);

  const handleSortChange = (order) => {
    setSortOrder(order);
    setIsSortDropdownOpen(false);
  };

  const handleCategoryChange = (category) => {
    setCategoryFilter(category);
    setIsCategoryDropdownOpen(false);
  };

  const getSortLabel = () => {
    if (sortOrder === 'priceAsc') return 'Price: Low to High';
    if (sortOrder === 'priceDesc') return 'Price: High to Low';
    if (sortOrder === 'nameAsc') return 'Name: A-Z';
    if (sortOrder === 'nameDesc') return 'Name: Z-A';
    return 'Default';
  };

  return (
    <nav className="navbar-container">
      {/* Left Side: Cart Icon */}
      <div className="nav-left">
        <button onClick={onCartIconClick} className="nav-icon-button">
          <FaShoppingCart />
        </button>
      </div>

      {/* Center Section: Logo & Search */}
      <div className="nav-center">
        <img src={oasis} alt="Groomberg Logo" className="brand-logo" />
        <input
          type="text"
          placeholder="Search for products..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right Side: Sort, Filter, & Account Icon */}
      <div className="nav-right">
        <div className="dropdown-group">
          <label className="dropdown-label">Sort:</label>
          <button onClick={toggleSortDropdown} className="dropdown-label-btn">{getSortLabel()}</button>
          {isSortDropdownOpen && (
            <div className="dropdown-menu sort-filter-menu">
              <button onClick={() => handleSortChange('')} className="dropdown-item">Default</button>
              <button onClick={() => handleSortChange('priceAsc')} className="dropdown-item">Price: Low to High</button>
              <button onClick={() => handleSortChange('priceDesc')} className="dropdown-item">Price: High to Low</button>
              <button onClick={() => handleSortChange('nameAsc')} className="dropdown-item">Name: A-Z</button>
              <button onClick={() => handleSortChange('nameDesc')} className="dropdown-item">Name: Z-A</button>
            </div>
          )}
        </div>
        
        <div className="dropdown-group">
          <label className="dropdown-label">Category:</label>
          <button onClick={toggleCategoryDropdown} className="dropdown-label-btn">{categoryFilter || 'All'}</button>
          {isCategoryDropdownOpen && (
            <div className="dropdown-menu sort-filter-menu">
              <button onClick={() => handleCategoryChange('')} className="dropdown-item">All</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => handleCategoryChange(cat)} className="dropdown-item">{cat}</button>
              ))}
            </div>
          )}
        </div>

        {/* Profile Icon with Dropdown */}
       {user ? (
    <div className="user-dropdown-container">
        <button onClick={toggleProfileDropdown} className="nav-icon-button">
            <FaUser />
        </button>
        {isProfileDropdownOpen && (
            <div className="dropdown-menu">
                <p className="welcome-message">Welcome, {user.name}!</p>
                
                {/* --- ADMIN ONLY LINKS --- */}
                {user.role === 'admin' && (
                    <>
                        <Link to="/add-product" onClick={toggleProfileDropdown} className="dropdown-item">Add Product</Link>
                        {/* Link to ADMIN's ALL ORDERS page */}
                        <Link to="/orders" onClick={toggleProfileDropdown} className="dropdown-item">View All Orders</Link>
                    </>
                )}
                
                {/* --- USER/ALL LOGGED-IN LINKS (Personal History) --- */}
                {user.role === 'user' && (
                    // Link to USER's personal order history page
                    <Link to="/myOrders" onClick={toggleProfileDropdown} className="dropdown-item">My Orders</Link>
                )}
                
                {/* --- LOGOUT --- */}
                <button onClick={() => logout(navigate)} className="dropdown-item">Logout</button>
            </div>
        )}
    </div>
) : (
    <div className="user-dropdown-container">
        <button onClick={toggleProfileDropdown} className="nav-icon-button">
            <FaUser />
        </button>
        {isProfileDropdownOpen && (
            <div className="dropdown-menu">
                <p className="welcome-message">Hello Handsome!</p>
                <Link to="/login" onClick={toggleProfileDropdown} className="dropdown-item">Login</Link>
                <Link to="/register" onClick={toggleProfileDropdown} className="dropdown-item">Register</Link>
            </div>
        )}
    </div>
)}
      </div>
    </nav>
  );
};

export default Navbar;
