// Contract Configuration
// Please replace CONTRACT_ADDRESS with your deployed contract address
export const CONTRACT_ADDRESS = '0xAeBf7aD61F0a81320f7a703620315E06f8b10D04'; // Please replace with your actual deployed contract address

// ABI - Get from the compiled contract JSON file
export const CONTRACT_ABI = [
  "function registerProduct(address initialOwner, string calldata serialNumber, string calldata model, uint64 warrantyDurationInSeconds, uint32 claimLimit) external returns (uint256)",
  "function getProductDetails(uint256 tokenId) external view returns (tuple(string serialNumber, string model, address manufacturer, uint64 manufactureTimestamp, uint64 warrantyDuration, uint64 warrantyStart, uint64 warrantyExpiration, uint32 warrantyClaimLimit, uint32 warrantyClaimCount))",
  "function getWarrantyClaim(uint256 claimId) external view returns (tuple(uint256 tokenId, address customer, string issueDescription, uint64 submittedAt, bool processed, bool approved, string serviceNotes, uint64 processedAt))",
  "function submitWarrantyClaim(uint256 tokenId, string calldata issueDescription) external returns (uint256)",
  "function processWarrantyClaim(uint256 claimId, bool approved) external",
  "function recordService(uint256 claimId, string calldata serviceNotes) external",
  "function isWarrantyActive(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenIdForSerialHash(bytes32) external view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function MANUFACTURER_ROLE() external view returns (bytes32)",
  "function RETAILER_ROLE() external view returns (bytes32)",
  "function SERVICE_CENTER_ROLE() external view returns (bytes32)",
  "function test(bytes32 keyHash) external returns (bytes32)",
  
  // Events
  "event ProductRegistered(uint256 indexed tokenId, string serialNumber, string model, address indexed manufacturer, address indexed initialOwner, uint64 timestamp, uint64 warrantyDuration, uint32 claimLimit)",
  "event WarrantyActivated(uint256 indexed tokenId, address indexed customer, uint64 startTime, uint64 expirationTime)",
  "event WarrantyClaimSubmitted(uint256 indexed claimId, uint256 indexed tokenId, address indexed customer, string issueDescription, uint64 submittedAt)",
  "event WarrantyClaimProcessed(uint256 indexed claimId, uint256 indexed tokenId, address indexed serviceCenter, bool approved, uint64 processedAt)",
  "event ServiceRecorded(uint256 indexed tokenId, uint256 indexed claimId, address indexed serviceCenter, string serviceNotes, uint64 serviceDate)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
