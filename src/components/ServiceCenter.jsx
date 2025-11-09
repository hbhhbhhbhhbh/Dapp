import React, { useState, useEffect } from 'react';
import { getContract, formatAddress, formatTimestamp } from '../utils/web3';
import './ServiceCenter.css';

const ServiceCenter = ({ signer }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [serviceNotes, setServiceNotes] = useState('');
  const [claimId, setClaimId] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    // Automatically load all claims when component mounts
    if (signer) {
      loadAllClaims();
    }
  }, [signer]);

  const loadAllClaims = async () => {
    setLoadingAll(true);
    try {
      const contract = getContract(signer);
      
      // Query all WarrantyClaimSubmitted events
      const filter = contract.filters.WarrantyClaimSubmitted();
      const events = await contract.queryFilter(filter);
      
      // Get detailed information of all claims
      const claimPromises = events.map(async (event) => {
        try {
          const claimId = Number(event.args.claimId);
          const claim = await contract.getWarrantyClaim(claimId);
          
          // Correctly parse tuple structure, handle BigInt type
          const parseValue = (value) => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'bigint') return Number(value);
            if (typeof value === 'string') return parseInt(value, 10) || 0;
            return Number(value) || 0;
          };
          
          return {
            claimId,
            tokenId: parseValue(claim.tokenId || claim[0]),
            customer: (claim.customer || claim[1] || '0x0').toString(),
            issueDescription: (claim.issueDescription || claim[2] || '').toString(),
            submittedAt: parseValue(claim.submittedAt || claim[3]),
            processed: claim.processed !== undefined ? Boolean(claim.processed) : Boolean(claim[4] || false),
            approved: claim.approved !== undefined ? Boolean(claim.approved) : Boolean(claim[5] || false),
            serviceNotes: (claim.serviceNotes || claim[6] || '').toString(),
            processedAt: parseValue(claim.processedAt || claim[7])
          };
        } catch (error) {
          console.error(`Failed to load claim ${event.args.claimId}:`, error);
          return null;
        }
      });
      
      const allClaims = await Promise.all(claimPromises);
      // Sort by claim ID in descending order (newest first)
      const validClaims = allClaims
        .filter(claim => claim !== null)
        .sort((a, b) => b.claimId - a.claimId);
      
      setClaims(validClaims);
    } catch (error) {
      console.error('Failed to load all warranty claims:', error);
      alert('Failed to load all warranty claims: ' + (error.reason || error.message));
    } finally {
      setLoadingAll(false);
    }
  };

  const loadClaim = async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const contract = getContract(signer);
      const claim = await contract.getWarrantyClaim(claimId);
      
      // Correctly parse tuple structure, handle BigInt type
      const parseValue = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'string') return parseInt(value, 10) || 0;
        return Number(value) || 0;
      };
      
      const newClaim = {
        claimId: Number(claimId),
        tokenId: parseValue(claim.tokenId || claim[0]),
        customer: (claim.customer || claim[1] || '0x0').toString(),
        issueDescription: (claim.issueDescription || claim[2] || '').toString(),
        submittedAt: parseValue(claim.submittedAt || claim[3]),
        processed: claim.processed !== undefined ? Boolean(claim.processed) : Boolean(claim[4] || false),
        approved: claim.approved !== undefined ? Boolean(claim.approved) : Boolean(claim[5] || false),
        serviceNotes: (claim.serviceNotes || claim[6] || '').toString(),
        processedAt: parseValue(claim.processedAt || claim[7])
      };
      
      // Check if already exists, add if not
      const exists = claims.find(c => c.claimId === newClaim.claimId);
      if (!exists) {
        setClaims([newClaim, ...claims].sort((a, b) => b.claimId - a.claimId));
      } else {
        // Update existing claim
        setClaims(claims.map(c => 
          c.claimId === newClaim.claimId ? newClaim : c
        ));
      }
      setClaimId('');
    } catch (error) {
      console.error('Failed to load warranty claim:', error);
      alert('Failed to load warranty claim: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClaim = async (claimId, approved) => {
    setLoading(true);
    try {
      const contract = getContract(signer);
      const tx = await contract.processWarrantyClaim(claimId, approved);
      await tx.wait();
      alert(`Warranty claim ${approved ? 'approved' : 'rejected'}`);
      // Reload the claim to update status
      const claim = await contract.getWarrantyClaim(claimId);
      const parseValue = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'string') return parseInt(value, 10) || 0;
        return Number(value) || 0;
      };
      
      const updatedClaim = {
        claimId,
        tokenId: parseValue(claim.tokenId || claim[0]),
        customer: (claim.customer || claim[1] || '0x0').toString(),
        issueDescription: (claim.issueDescription || claim[2] || '').toString(),
        submittedAt: parseValue(claim.submittedAt || claim[3]),
        processed: claim.processed !== undefined ? Boolean(claim.processed) : Boolean(claim[4] || false),
        approved: claim.approved !== undefined ? Boolean(claim.approved) : Boolean(claim[5] || false),
        serviceNotes: (claim.serviceNotes || claim[6] || '').toString(),
        processedAt: parseValue(claim.processedAt || claim[7])
      };
      setClaims(claims.map(c => 
        c.claimId === claimId ? updatedClaim : c
      ));
    } catch (error) {
      console.error('Failed to process warranty claim:', error);
      alert('Failed to process warranty claim: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordService = async () => {
    if (!selectedClaim || !serviceNotes) {
      alert('Please select a claim and enter service notes');
      return;
    }
    
    setLoading(true);
    try {
      const contract = getContract(signer);
      const tx = await contract.recordService(selectedClaim, serviceNotes);
      await tx.wait();
      alert('Service record saved');
      setServiceNotes('');
      setSelectedClaim(null);
      // Reload the claim to update status
      const claim = await contract.getWarrantyClaim(selectedClaim);
      const updatedClaim = {
        claimId: selectedClaim,
        tokenId: Number(claim.tokenId || claim[0] || 0),
        customer: claim.customer || claim[1] || '0x0',
        issueDescription: claim.issueDescription || claim[2] || '',
        submittedAt: Number(claim.submittedAt || claim[3] || 0),
        processed: claim.processed !== undefined ? claim.processed : (claim[4] || false),
        approved: claim.approved !== undefined ? claim.approved : (claim[5] || false),
        serviceNotes: claim.serviceNotes || claim[6] || '',
        processedAt: Number(claim.processedAt || claim[7] || 0)
      };
      setClaims(claims.map(c => 
        c.claimId === selectedClaim ? updatedClaim : c
      ));
    } catch (error) {
      console.error('Failed to record service:', error);
      alert('Failed to record service: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="service-center">
      <div className="service-center-header">
        <h2>Service Center Management</h2>
        <div className="header-actions">
          <button 
            onClick={loadAllClaims} 
            disabled={loadingAll}
            className="refresh-button"
          >
            {loadingAll ? 'Loading...' : 'Refresh All Claims'}
          </button>
        </div>
      </div>
      
      <div className="search-section">
        <div className="search-box">
          <input
            type="number"
            placeholder="Enter warranty claim ID to query"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadClaim()}
          />
          <button onClick={loadClaim} disabled={loading || !claimId}>
            {loading ? 'Querying...' : 'Query'}
          </button>
        </div>
      </div>

      <div className="claims-summary">
        <p>Found <strong>{claims.length}</strong> warranty claim(s)</p>
        {claims.filter(c => !c.processed).length > 0 && (
          <p className="pending-count">
            Pending: <strong>{claims.filter(c => !c.processed).length}</strong>
          </p>
        )}
      </div>

      <div className="claims-list">
        {claims.length === 0 && !loadingAll ? (
          <div className="empty-claims">
            <p>No warranty claims yet</p>
            <p className="hint">When customers submit warranty claims, they will appear here</p>
          </div>
        ) : (
          claims.map((claim) => (
            <div key={claim.claimId} className="claim-card">
            <div className="claim-header">
              <h3>Warranty Claim #{claim.claimId}</h3>
              <span className={`status-badge ${claim.processed ? (claim.approved ? 'approved' : 'rejected') : 'pending'}`}>
                {claim.processed ? (claim.approved ? 'Approved' : 'Rejected') : 'Pending'}
              </span>
            </div>
            
            <div className="claim-info">
              <p><strong>Product ID:</strong> {claim.tokenId || 'Unknown'}</p>
              <p><strong>Customer:</strong> {claim.customer && claim.customer !== '0x0' ? formatAddress(claim.customer) : 'Unknown'}</p>
              <p><strong>Issue Description:</strong> {claim.issueDescription || 'None'}</p>
              <p><strong>Submitted At:</strong> {claim.submittedAt > 0 ? formatTimestamp(claim.submittedAt) : 'Unknown'}</p>
              {claim.processed && claim.processedAt > 0 && (
                <p><strong>Processed At:</strong> {formatTimestamp(claim.processedAt)}</p>
              )}
              {claim.serviceNotes && (
                <p><strong>Service Notes:</strong> {claim.serviceNotes}</p>
              )}
            </div>

            {!claim.processed && (
              <div className="claim-actions">
                <button
                  onClick={() => handleProcessClaim(claim.claimId, true)}
                  className="approve-button"
                  disabled={loading}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleProcessClaim(claim.claimId, false)}
                  className="reject-button"
                  disabled={loading}
                >
                  Reject
                </button>
              </div>
            )}

            {claim.processed && claim.approved && !claim.serviceNotes && (
              <div className="service-section">
                <textarea
                  placeholder="Enter service notes..."
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  rows="3"
                />
                <button
                  onClick={() => {
                    setSelectedClaim(claim.claimId);
                    handleRecordService();
                  }}
                  className="record-button"
                  disabled={loading || !serviceNotes}
                >
                  Record Service
                </button>
              </div>
            )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceCenter;

