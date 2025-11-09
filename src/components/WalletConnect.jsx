import React, { useState, useEffect } from 'react';
import { connectWallet, formatAddress } from '../utils/web3';
import './WalletConnect.css';

const WalletConnect = ({ onConnect, account }) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { address, signer } = await connectWallet();
      onConnect({ address, signer });
    } catch (error) {
      alert(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-connect">
      {account ? (
        <div className="wallet-connected">
          <span className="wallet-address">{formatAddress(account)}</span>
          <div className="wallet-status">Connected</div>
        </div>
      ) : (
        <button 
          className="connect-button" 
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};

export default WalletConnect;

