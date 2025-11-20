import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contractConfig';

// Get Web3 provider
export const getProvider = () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('Please install MetaMask wallet');
};

// Connect wallet
export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const provider = getProvider();
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      return {
        address: accounts[0],
        signer,
        provider
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  } else {
    throw new Error('Please install MetaMask wallet');
  }
};

// Get contract instance
export const getContract = (signer) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

// Format address
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format timestamp
export const formatTimestamp = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'Not Activated';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString('en-US');
};

// Calculate remaining days
export const getDaysRemaining = (expirationTimestamp) => {
  if (!expirationTimestamp || expirationTimestamp === 0) return 0;
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(expirationTimestamp) - now;
  return Math.max(0, Math.floor(remaining / 86400));
};



export const getSerialHash = (serialNumber) => {
  if (!serialNumber) return ethers.ZeroHash;
  
  // 关键步骤：先转换为 UTF-8 字节，再计算哈希
  const bytes = ethers.toUtf8Bytes(serialNumber); 
  // console.log(bytes);
  // 返回标准的 0x... 格式的十六进制字符串
  return ethers.keccak256(
    ethers.toUtf8Bytes(serialNumber)
);
};