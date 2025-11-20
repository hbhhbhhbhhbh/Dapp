import React, { useState } from 'react';
import { getContract } from '../utils/web3';
import './RegisterProduct.css';

const RegisterProduct = ({ signer, onSuccess }) => {
  const [formData, setFormData] = useState({
    initialOwner: '',
    serialNumber: '',
    model: '',
    warrantyDuration: '', // Days
    claimLimit: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const contract = getContract(signer);
      
      // ✅ 优化修改点：将保修期从天转换为秒，并确保所有数字参数都使用 BigInt 
      // 智能合约需要 uint64 和 uint32
      const warrantyDurationInSeconds = BigInt(formData.warrantyDuration) * BigInt(86400); // 1 day = 86400 seconds
      const claimLimitBigInt = BigInt(formData.claimLimit);

      console.log(formData);
      console.log(warrantyDurationInSeconds);
      console.log(claimLimitBigInt);
      // ✅ 传递正确的 BigInt 参数
      const tx = await contract.registerProduct(
        formData.initialOwner,
        formData.serialNumber,
        formData.model,
        warrantyDurationInSeconds, // uint64
        claimLimitBigInt          // uint32
      );
      
      console.log(tx);
      await tx.wait();
      alert('Product registered successfully!');
      
      setFormData({
        initialOwner: '',
        serialNumber: '',
        model: '',
        warrantyDuration: '',
        claimLimit: ''
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to register product:', error);
      alert('Failed to register product: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 确保 manufacturer 角色才能使用此功能
  // const isManufacturer = roles?.isManufacturer; 
  // if (!isManufacturer) return <div className="register-product">Not Authorized: Only Manufacturer role can register products.</div>;

  return (
    <div className="register-product">
      <h2>Register New Product</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label>Initial Owner (Retailer Address):</label>
          <input
            type="text"
            name="initialOwner"
            value={formData.initialOwner}
            onChange={handleChange}
            placeholder="0x..."
            required
            className="address-input"
          />
        </div>
        
        <div className="form-group">
          <label>Serial Number:</label>
          <input
            type="text"
            name="serialNumber"
            value={formData.serialNumber}
            onChange={handleChange}
            placeholder="Enter product serial number"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Model:</label>
          <input
            type="text"
            name="model"
            value={formData.model}
            onChange={handleChange}
            placeholder="Enter product model"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Warranty Duration (Days):</label>
          <input
            type="number"
            name="warrantyDuration"
            value={formData.warrantyDuration}
            onChange={handleChange}
            placeholder="e.g., 365"
            required
            min="1"
          />
        </div>
        
        <div className="form-group">
          <label>Claim Limit:</label>
          <input
            type="number"
            name="claimLimit"
            value={formData.claimLimit}
            onChange={handleChange}
            placeholder="e.g., 3"
            required
            min="1"
          />
        </div>
        
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Registering...' : 'Register Product'}
        </button>
      </form>
    </div>
  );
};

export default RegisterProduct;