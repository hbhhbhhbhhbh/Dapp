import React, { useState, useEffect } from 'react';
import { getContract, formatAddress } from '../utils/web3';
import './RoleManager.css';

const RoleManager = ({ signer, account, onRoleUpdate }) => {
  const [roles, setRoles] = useState({
    isAdmin: false,
    isManufacturer: false,
    isRetailer: false,
    isServiceCenter: false
  });
  const [loading, setLoading] = useState(false);
  const [grantRoleForm, setGrantRoleForm] = useState({
    role: '',
    address: ''
  });

  useEffect(() => {
    if (signer && account) {
      checkRoles();
    }
  }, [signer, account]);

  const checkRoles = async () => {
    try {
      const contract = getContract(signer);
      const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const manufacturerRole = await contract.MANUFACTURER_ROLE();
      const retailerRole = await contract.RETAILER_ROLE();
      const serviceCenterRole = await contract.SERVICE_CENTER_ROLE();
      
      const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, account);
      const isManufacturer = await contract.hasRole(manufacturerRole, account);
      const isRetailer = await contract.hasRole(retailerRole, account);
      const isServiceCenter = await contract.hasRole(serviceCenterRole, account);
      
      setRoles({
        isAdmin,
        isManufacturer,
        isRetailer,
        isServiceCenter
      });
    } catch (error) {
      console.error('Failed to check roles:', error);
    }
  };

  const handleGrantRole = async () => {
    if (!grantRoleForm.role || !grantRoleForm.address) {
      alert('Please fill in complete role and address information');
      return;
    }

    setLoading(true);
    try {
      const contract = getContract(signer);
      let roleHash;
      
      switch (grantRoleForm.role) {
        case 'MANUFACTURER':
          roleHash = await contract.MANUFACTURER_ROLE();
          break;
        case 'RETAILER':
          roleHash = await contract.RETAILER_ROLE();
          break;
        case 'SERVICE_CENTER':
          roleHash = await contract.SERVICE_CENTER_ROLE();
          break;
        default:
          alert('Invalid role type');
          setLoading(false);
          return;
      }
      
      const tx = await contract.grantRole(roleHash, grantRoleForm.address);
      await tx.wait();
      alert('Role granted successfully!');
      setGrantRoleForm({ role: '', address: '' });
      await checkRoles();
      if (onRoleUpdate) {
        onRoleUpdate();
      }
    } catch (error) {
      console.error('Failed to grant role:', error);
      alert('Failed to grant role: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-manager">
      <h2>Role Management</h2>
      
      <div className="current-roles">
        <h3>Current Account Roles</h3>
        <div className="roles-grid">
          <div className={`role-badge ${roles.isAdmin ? 'active' : 'inactive'}`}>
            <span className="role-name">Admin</span>
            <span className="role-status">{roles.isAdmin ? '✓' : '✗'}</span>
          </div>
          <div className={`role-badge ${roles.isManufacturer ? 'active' : 'inactive'}`}>
            <span className="role-name">Manufacturer</span>
            <span className="role-status">{roles.isManufacturer ? '✓' : '✗'}</span>
          </div>
          <div className={`role-badge ${roles.isRetailer ? 'active' : 'inactive'}`}>
            <span className="role-name">Retailer</span>
            <span className="role-status">{roles.isRetailer ? '✓' : '✗'}</span>
          </div>
          <div className={`role-badge ${roles.isServiceCenter ? 'active' : 'inactive'}`}>
            <span className="role-name">Service Center</span>
            <span className="role-status">{roles.isServiceCenter ? '✓' : '✗'}</span>
          </div>
        </div>
      </div>

      {roles.isAdmin && (
        <div className="grant-role-section">
          <h3>Grant Role (Admin Only)</h3>
          <div className="grant-form">
            <div className="form-group">
              <label>Role Type:</label>
              <select
                value={grantRoleForm.role}
                onChange={(e) => setGrantRoleForm({ ...grantRoleForm, role: e.target.value })}
              >
                <option value="">Select Role</option>
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="RETAILER">Retailer</option>
                <option value="SERVICE_CENTER">Service Center</option>
              </select>
            </div>
            <div className="form-group">
              <label>Account Address:</label>
              <input
                type="text"
                placeholder="0x..."
                value={grantRoleForm.address}
                onChange={(e) => setGrantRoleForm({ ...grantRoleForm, address: e.target.value })}
              />
            </div>
            <button
              onClick={handleGrantRole}
              disabled={loading}
              className="grant-button"
            >
              {loading ? 'Granting...' : 'Grant Role'}
            </button>
          </div>
        </div>
      )}

      <div className="role-info">
        <h3>Role Descriptions</h3>
        <ul>
          <li><strong>Admin:</strong> Can grant and revoke all roles</li>
          <li><strong>Manufacturer:</strong> Can register new products</li>
          <li><strong>Retailer:</strong> Can receive and transfer products</li>
          <li><strong>Service Center:</strong> Can process warranty claims and record services</li>
        </ul>
      </div>
    </div>
  );
};

export default RoleManager;

