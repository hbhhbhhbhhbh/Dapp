import React, { useState, useEffect } from 'react';
import { getContract, formatAddress, getSerialHash } from '../utils/web3';
import './SellProduct.css';

const SellProduct = ({ signer, account, roles }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (signer && account && roles?.isRetailer) {
      console.log(signer, account, roles);
      loadAvailableProducts();
    }
  }, [signer, account, roles]);

  const loadAvailableProducts = async () => {
    setLoadingProducts(true);
    try {
      const contract = getContract(signer);
      
      // Query all ProductRegistered events
      const productFilter = contract.filters.ProductRegistered();
      const productEvents = await contract.queryFilter(productFilter);
      console.log(productEvents);
      // Get details of all products and filter those belonging to current retailer with unactivated warranty
      const productPromises = productEvents.map(async (event) => {
        try {
          const tokenId = Number(event.args.tokenId);
          console.log(tokenId);
          // Check if product belongs to current retailer
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() !== account.toLowerCase()) {
            return null; // Does not belong to current retailer
          }
          
          // Get product details
          const details = await contract.getProductDetails(tokenId);
          
          // Parse product details
          const parseValue = (value) => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'bigint') return Number(value);
            if (typeof value === 'string') return parseInt(value, 10) || 0;
            return Number(value) || 0;
          };
          
          const warrantyStart = parseValue(details.warrantyStart || details[6]);
          
          // Only return products with unactivated warranty
          if (warrantyStart > 0) {
            return null; // Warranty activated, cannot sell
          }
          
          return {
            tokenId,
            serialNumber: (details.serialNumber || details[0] || '').toString(),
            model: (details.model || details[1] || '').toString(),
            manufacturer: (details.manufacturer || details[2] || '0x0').toString(),
            manufactureTimestamp: parseValue(details.manufactureTimestamp || details[3])
          };
        } catch (error) {
          console.error(`Failed to load product ${event.args.tokenId}:`, error);
          return null;
        }
      });
      
      const products = await Promise.all(productPromises);
      const validProducts = products.filter(p => p !== null);
      setAvailableProducts(validProducts);
    } catch (error) {
      console.error('Failed to load available products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();

    if (!serialNumber.trim()) {
      alert('Please enter serial number');
      return;
    }

    if (!model.trim()) {
      alert('Please enter model');
      return;
    }

    if (!toAddress.trim()) {
      alert('Please enter customer address');
      return;
    }

    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    try {
      const contract = getContract(signer);
      console.log(contract);
      // Get tokenId by serial number
      let tokenId;
      try {
        console.log(serialNumber);
        console.log(getSerialHash(serialNumber));
        const serialHash = getSerialHash(serialNumber);
        console.log(serialHash);
        
        tokenId = await contract.tokenIdForSerialHash(getSerialHash(serialNumber));

        // console.log(tokenId);
      } catch (error) {
        alert('Product not found with this serial number, please check if the serial number is correct');
        setLoading(false);
        return;
      }
      
      if (!tokenId || Number(tokenId) === 0) {
        alert('Product not found with this serial number');
        setLoading(false);
        return;
      }

      // Get product details
      const details = await contract.getProductDetails(tokenId);
      
      // Verify product belongs to current retailer
      const owner = await contract.ownerOf(tokenId);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        alert('This product does not belong to you, cannot sell');
        setLoading(false);
        return;
      }

      // Verify warranty is not activated (products with activated warranty cannot be sold again)
      if (details.warrantyStart > 0) {
        alert('This product\'s warranty is activated, cannot sell again');
        setLoading(false);
        return;
      }

      // Verify model matches
      if (details.model.toLowerCase() !== model.trim().toLowerCase()) {
        alert(`Model mismatch. Product model is: ${details.model}`);
        setLoading(false);
        return;
      }

      // Execute transfer
      const tx = await contract.safeTransferFrom(account, toAddress, tokenId);
      await tx.wait();
      alert('Product transferred successfully! Warranty has been automatically activated.');
      
      // Clear form and refresh product list
      setSerialNumber('');
      setModel('');
      setToAddress('');
      loadAvailableProducts(); // Refresh available products list
    } catch (error) {
      console.error('Failed to transfer product:', error);
      alert('Failed to transfer product: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!roles?.isRetailer) {
    return (
      <div className="permission-denied">
        <h2>Insufficient Permissions</h2>
        <p>You need the Retailer role to sell products.</p>
        <p>Please go to the "Role Management" page to see how to get roles, or contact an administrator to grant you the Retailer role.</p>
      </div>
    );
  }

  return (
    <div className="sell-product">
      <div className="sell-product-header">
        <div>
          <h2>Sell Product</h2>
          <p className="description">Enter serial number, model, and customer address to complete product transfer. Warranty will be automatically activated after transfer.</p>
        </div>
        <button 
          onClick={loadAvailableProducts} 
          disabled={loadingProducts}
          className="refresh-products-button"
        >
          {loadingProducts ? 'Loading...' : 'Refresh Product List'}
        </button>
      </div>

      {/* Available products list */}
      {availableProducts.length > 0 && (
        <div className="available-products-section">
          <h3>Available Products ({availableProducts.length} total)</h3>
          <div className="products-grid">
            {availableProducts.map((product) => (
              <div key={product.tokenId} className="product-item-card">
                <div className="product-item-header">
                  <span className="product-id">Product #{product.tokenId}</span>
                </div>
                <div className="product-item-info">
                  <p><strong>Serial Number:</strong> {product.serialNumber}</p>
                  <p><strong>Model:</strong> {product.model}</p>
                  <p><strong>Manufacturer:</strong> {formatAddress(product.manufacturer)}</p>
                </div>
                <button
                  className="select-product-btn"
                  onClick={() => {
                    setSerialNumber(product.serialNumber);
                    setModel(product.model);
                  }}
                >
                  Select This Product
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sell-form-container">
        <form onSubmit={handleSell} className="sell-form">
          <div className="form-group">
            <label>Serial Number <span className="required">*</span>:</label>
              <input
                type="text"
                placeholder="Enter product serial number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Model <span className="required">*</span>:</label>
              <input
                type="text"
                placeholder="Enter product model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Customer Address <span className="required">*</span>:</label>
              <input
                type="text"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                required
                disabled={loading}
                className="address-input"
              />
            <small>Warranty will be automatically activated after transfer to customer</small>
          </div>

          <button
            type="submit"
            disabled={loading || !serialNumber.trim() || !model.trim() || !toAddress.trim()}
            className="sell-button"
          >
            {loading ? 'Transferring...' : 'Confirm Sale'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellProduct;

