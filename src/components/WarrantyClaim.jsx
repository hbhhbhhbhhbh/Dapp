import React, { useState } from 'react';
import { getContract,getSerialHash } from '../utils/web3';
import './WarrantyClaim.css';

const WarrantyClaim = ({ signer, account }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!serialNumber.trim()) {
      alert('Please enter serial number');
      return;
    }

    if (!model.trim()) {
      alert('Please enter model');
      return;
    }

    setLoading(true);
    
    try {
      const contract = getContract(signer);
      
      // Get tokenId by serial number
      let tokenId;
      try {
        tokenId = await contract.tokenIdForSerialHash(getSerialHash(serialNumber));
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
      
      // Verify product belongs to current user
      const owner = await contract.ownerOf(tokenId);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        alert('This product does not belong to you, cannot submit warranty claim');
        setLoading(false);
        return;
      }

      // Verify model matches
      if (details.model.toLowerCase() !== model.trim().toLowerCase()) {
        alert(`Model mismatch. Product model is: ${details.model}`);
        setLoading(false);
        return;
      }

      // Submit warranty claim
      const tx = await contract.submitWarrantyClaim(tokenId, issueDescription);
      await tx.wait();
      alert('Warranty claim submitted successfully!');
      setSerialNumber('');
      setModel('');
      setIssueDescription('');
    } catch (error) {
      console.error('Failed to submit warranty claim:', error);
      alert('Failed to submit warranty claim: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="warranty-claim">
      <h2>Submit Warranty Claim</h2>
      <form onSubmit={handleSubmit} className="claim-form">
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
          <label>Issue Description <span className="required">*</span>:</label>
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Please describe the product issue in detail..."
            rows="5"
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
      </form>
    </div>
  );
};

export default WarrantyClaim;

