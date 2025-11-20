import React, { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import ProductList from './components/ProductList';
import RegisterProduct from './components/RegisterProduct';
import WarrantyClaim from './components/WarrantyClaim';
import ServiceCenter from './components/ServiceCenter';
import RoleManager from './components/RoleManager';
import SellProduct from './components/SellProduct';
import { getProvider, getContract } from './utils/web3';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [roles, setRoles] = useState({
    isAdmin: false,
    isManufacturer: false,
    isRetailer: false,
    isServiceCenter: false
  });

  // 🌟 修改点 1: 结合检查连接和事件监听 🌟
  useEffect(() => {
    checkWalletConnection();

    if (typeof window.ethereum !== 'undefined') {
        // 监听账户切换/断开连接
        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                // 用户在钱包中断开了连接
                setAccount(null);
                setSigner(null);
                setRoles({ 
                    isAdmin: false, isManufacturer: false, 
                    isRetailer: false, isServiceCenter: false 
                });
            } else {
                // 用户切换了账户，重新设置 signer 和 account
                const provider = getProvider();
                provider.getSigner(accounts[0]).then(newSigner => {
                    handleConnect({ address: accounts[0], signer: newSigner });
                });
            }
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);

        // 清理函数
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        };
    }
  }, []); // 仅在挂载时执行

  useEffect(() => {
    if (signer && account) {
      checkRoles();
    }
  }, [signer, account]);

  // 🌟 修改点 2: 改进 checkWalletConnection，使用 eth_accounts 尝试持久化连接 🌟
  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = getProvider();
        
        // 尝试获取当前已授权的账户 (MetaMask持久化状态)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }); 
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner(accounts[0]);
          setAccount(accounts[0]);
          setSigner(signer);
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    }
  };

  const checkRoles = async () => {
    // ... (保持 checkRoles 函数不变)
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

  const handleConnect = ({ address, signer }) => {
    setAccount(address);
    setSigner(signer);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>Product Provenance & Warranty Management System</h1>
          <WalletConnect account={account} onConnect={handleConnect} />
        </div>
      </header>

      {account && (
        <nav className="app-nav">
          <button
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            My Products
          </button>
          <button
            className={activeTab === 'register' ? 'active' : ''}
            onClick={() => setActiveTab('register')}
            title={!roles.isManufacturer ? 'Requires Manufacturer role' : ''}
          >
            Register Product {!roles.isManufacturer && '🔒'}
          </button>
          <button
            className={activeTab === 'warranty' ? 'active' : ''}
            onClick={() => setActiveTab('warranty')}
          >
            Warranty Claim
          </button>
          <button
            className={activeTab === 'service' ? 'active' : ''}
            onClick={() => setActiveTab('service')}
            title={!roles.isServiceCenter ? 'Requires Service Center role' : ''}
          >
            Service Center {!roles.isServiceCenter && '🔒'}
          </button>
          <button
            className={activeTab === 'sell' ? 'active' : ''}
            onClick={() => setActiveTab('sell')}
            title={!roles.isRetailer ? 'Requires Retailer role' : ''}
          >
            Sell Product {!roles.isRetailer && '🔒'}
          </button>
          <button
            className={activeTab === 'roles' ? 'active' : ''}
            onClick={() => setActiveTab('roles')}
          >
            Role Management
          </button>
        </nav>
      )}

      <main className="app-main">
        {!account ? (
          <div className="welcome-screen">
            <h2>Welcome to Product Provenance & Warranty Management System</h2>
            <p>Please connect your wallet to get started</p>
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <ProductList signer={signer} account={account} roles={roles} />
            )}
            {activeTab === 'register' && (
              roles.isManufacturer ? (
                <RegisterProduct signer={signer} />
              ) : (
                <div className="permission-denied">
                  <h2>Insufficient Permissions</h2>
                  <p>You need the Manufacturer role to register products.</p>
                  <p>Please go to the "Role Management" page to see how to get roles, or contact an administrator to grant you the Manufacturer role.</p>
                </div>
              )
            )}
            {activeTab === 'warranty' && (
              <WarrantyClaim signer={signer} account={account} />
            )}
            {activeTab === 'service' && (
              roles.isServiceCenter ? (
                <ServiceCenter signer={signer} />
              ) : (
                <div className="permission-denied">
                  <h2>Insufficient Permissions</h2>
                  <p>You need the Service Center role to access this feature.</p>
                  <p>Please go to the "Role Management" page to see how to get roles, or contact an administrator to grant you the Service Center role.</p>
                </div>
              )
            )}
            {activeTab === 'sell' && (
              roles.isRetailer ? (
                <SellProduct signer={signer} account={account} roles={roles} />
              ) : (
                <div className="permission-denied">
                  <h2>Insufficient Permissions</h2>
                  <p>You need the Retailer role to sell products.</p>
                  <p>Please go to the "Role Management" page to see how to get roles, or contact an administrator to grant you the Retailer role.</p>
                </div>
              )
            )}
            {activeTab === 'roles' && (
              <RoleManager signer={signer} account={account} onRoleUpdate={checkRoles} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;