import React, { useState, useEffect } from 'react';
import { getContract, formatAddress, formatTimestamp, getDaysRemaining } from '../utils/web3';
import './ProductList.css';

const ProductList = ({ signer, account, roles }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTokenId, setSearchTokenId] = useState('');

  useEffect(() => {
    if (signer && account) {
      loadProducts();
    }
  }, [signer, account]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const contract = getContract(signer);
      
      // Method 1: Try using tokenOfOwnerByIndex (if contract supports ERC721Enumerable)
      let ids = [];
      try {
        const balance = await contract.balanceOf(account);
        console.log(balance);
        for (let i = 0; i < Number(balance); i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(account, i);
            console.log(tokenId);
            ids.push(Number(tokenId));
          } catch (error) {
            if (error.message && error.message.includes('tokenOfOwnerByIndex')) {
              break;
            }
            console.error(`Failed to get token ${i}:`, error);
          }
        }
      } catch (error) {
        console.log('Contract may not support tokenOfOwnerByIndex, using event query');
      }
      
      // Method 2: If method 1 fails, find products transferred to current user by querying Transfer events
      if (ids.length === 0) {
        try {
          const transferFilter = contract.filters.Transfer(null, account);
          const transferEvents = await contract.queryFilter(transferFilter);
          
          // Get all tokenIds transferred to current user
          const uniqueTokenIds = new Set();
          transferEvents.forEach(event => {
            const tokenId = Number(event.args.tokenId);
            if (tokenId > 0) {
              uniqueTokenIds.add(tokenId);
            }
          });
          
          ids = Array.from(uniqueTokenIds);
        } catch (error) {
          console.error('Failed to query Transfer events:', error);
        }
      }
      
      if (ids.length > 0) {
        const productPromises = ids.map(async (tokenId) => {
          try {
            // Verify product still belongs to current user
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() !== account.toLowerCase()) {
              return null; // Product has been transferred, no longer belongs to current user
            }
            
            const details = await contract.getProductDetails(tokenId);
            const isActive = await contract.isWarrantyActive(tokenId);
            
            // Parse product details
            const parseValue = (value) => {
              if (value === null || value === undefined) return 0;
              if (typeof value === 'bigint') return Number(value);
              if (typeof value === 'string') return parseInt(value, 10) || 0;
              return Number(value) || 0;
            };
            
            return {
              tokenId,
              serialNumber: (details.serialNumber || details[0] || '').toString(),
              model: (details.model || details[1] || '').toString(),
              manufacturer: (details.manufacturer || details[2] || '0x0').toString(),
              manufactureTimestamp: parseValue(details.manufactureTimestamp || details[3]),
              warrantyDuration: parseValue(details.warrantyDuration || details[4]),
              warrantyClaimLimit: parseValue(details.warrantyClaimLimit || details[5]),
              warrantyStart: parseValue(details.warrantyStart || details[6]),
              warrantyExpiration: parseValue(details.warrantyExpiration || details[7]),
              warrantyClaimCount: parseValue(details.warrantyClaimCount || details[8]),
              isWarrantyActive: isActive
            };
          } catch (error) {
            console.error(`Failed to get product ${tokenId} details:`, error);
            return null;
          }
        });
        
        const productsData = await Promise.all(productPromises);
        setProducts(productsData.filter(p => p !== null));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Don't show error, allow user to use search function
    } finally {
      setLoading(false);
    }
  };

  const searchProduct = async () => {
    if (!searchTokenId) {
      alert('Please enter product ID');
      return;
    }
    
    setLoading(true);
    try {
      const contract = getContract(signer);
      const owner = await contract.ownerOf(searchTokenId);
      console.log(owner);
      // Check if product belongs to current user
      if (owner.toLowerCase() !== account.toLowerCase()) {
        alert('This is not your product');
        setLoading(false);
        return;
      }
      
      const details = await contract.getProductDetails(searchTokenId);
      const isActive = await contract.isWarrantyActive(searchTokenId);
      console.log(details);
      // Parse product details
      const parseValue = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'string') return parseInt(value, 10) || 0;
        return Number(value) || 0;
      };
      
      const product = {
        tokenId: Number(searchTokenId),
        serialNumber: (details.serialNumber || details[0] || '').toString(),
        model: (details.model || details[1] || '').toString(),
        manufacturer: (details.manufacturer || details[2] || '0x0').toString(),
        manufactureTimestamp: parseValue(details.manufactureTimestamp || details[3]),
        warrantyDuration: parseValue(details.warrantyDuration || details[4]),
        warrantyClaimLimit: parseValue(details.warrantyClaimLimit || details[5]),
        warrantyStart: parseValue(details.warrantyStart || details[6]),
        warrantyExpiration: parseValue(details.warrantyExpiration || details[7]),
        warrantyClaimCount: parseValue(details.warrantyClaimCount || details[8]),
        isWarrantyActive: isActive
      };
      
      // Check if already exists to avoid duplicates
      const exists = products.find(p => p.tokenId === product.tokenId);
      if (!exists) {
        setProducts([...products, product]);
      }
      setSearchTokenId('');
    } catch (error) {
      console.error('Failed to search product:', error);
      alert('Failed to search product: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>You don't have any products yet</p>
      </div>
    );
  }

  return (
    <div className="product-list">
      <div className="product-list-header">
        <h2>My Products</h2>
        <div className="search-box">
          <input
            type="number"
            placeholder="Enter product ID to search"
            value={searchTokenId}
            onChange={(e) => setSearchTokenId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchProduct()}
          />
          <button onClick={searchProduct} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button onClick={loadProducts} disabled={loading} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.tokenId} className="product-card">
            <div className="product-header">
              <h3>Product #{product.tokenId}</h3>
              <span className={`warranty-badge ${product.isWarrantyActive ? 'active' : 'inactive'}`}>
                {product.isWarrantyActive ? 'Warranty Active' : 'Warranty Inactive'}
              </span>
            </div>
            <div className="product-info">
              <p><strong>Serial Number:</strong> {product.serialNumber}</p>
              <p><strong>Model:</strong> {product.model}</p>
              <p><strong>Manufacturer:</strong> {formatAddress(product.manufacturer)}</p>
              <p><strong>Manufacture Time:</strong> {formatTimestamp(product.manufactureTimestamp)}</p>
              {product.warrantyStart > 0 && (
                <>
                  <p><strong>Warranty Start:</strong> {formatTimestamp(product.warrantyStart)}</p>
                  <p><strong>Warranty Expiration:</strong> {formatTimestamp(product.warrantyExpiration)}</p>
                  <p><strong>Days Remaining:</strong> {getDaysRemaining(product.warrantyExpiration)} days</p>
                </>
              )}
              <p><strong>Claim Count:</strong> {Number(product.warrantyClaimCount)} / {Number(product.warrantyClaimLimit)}</p>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;

