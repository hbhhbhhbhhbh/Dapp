import React, { useState } from 'react';
import { getContract } from '../utils/web3';
import './TransferProduct.css';

const TransferProduct = ({ signer, account, tokenId, onSuccess }) => {
  const [toAddress, setToAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    try {
      const contract = getContract(signer);
      console.log(account)
      const tx = await contract.safeTransferFrom(account, toAddress, tokenId);
      await tx.wait();
      alert('Product transferred successfully! If transferred to a customer, warranty will be automatically activated.');
      setToAddress('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to transfer product:', error);
      alert('Failed to transfer product: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transfer-product">
      <h3>Transfer Product #{tokenId}</h3>
      <form onSubmit={handleTransfer} className="transfer-form">
        <div className="form-group">
          <label>Transfer To (Address):</label>
          <input
            type="text"
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            required
          />
          <small>Warranty will be automatically activated when transferred to customer</small>
        </div>
        <button type="submit" className="transfer-button" disabled={loading}>
          {loading ? 'Transferring...' : 'Confirm Transfer'}
        </button>
      </form>
    </div>
  );
};

export default TransferProduct;

