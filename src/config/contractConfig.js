// Contract Configuration
// Please replace CONTRACT_ADDRESS with your deployed contract address
export const CONTRACT_ADDRESS = '0x4B0B29C6aB8A135F0bF9E5Ef471E672c8129fD51'; // Please replace with your actual deployed contract address

// ABI - Get from the compiled contract JSON file
export const CONTRACT_ABI = [
  "function registerProduct(address initialOwner, string calldata serialNumber, string calldata model, uint256 warrantyDurationInSeconds, uint256 claimLimit) external returns (uint256)",
  "function getProductDetails(uint256 tokenId) external view returns (tuple(string serialNumber, string model, address manufacturer, uint256 manufactureTimestamp, uint256 warrantyDuration, uint256 warrantyClaimLimit, uint256 warrantyStart, uint256 warrantyExpiration, uint256 warrantyClaimCount))",
  "function getWarrantyClaim(uint256 claimId) external view returns (tuple(uint256 tokenId, address customer, string issueDescription, uint256 submittedAt, bool processed, bool approved, string serviceNotes, uint256 processedAt))",
  "function submitWarrantyClaim(uint256 tokenId, string calldata issueDescription) external returns (uint256)",
  "function processWarrantyClaim(uint256 claimId, bool approved) external",
  "function recordService(uint256 claimId, string calldata serviceNotes) external",
  "function isWarrantyActive(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenIdForSerialNumber(string) external view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function MANUFACTURER_ROLE() external view returns (bytes32)",
  "function RETAILER_ROLE() external view returns (bytes32)",
  "function SERVICE_CENTER_ROLE() external view returns (bytes32)",
  "event ProductRegistered(uint256 indexed tokenId, string serialNumber, string model, address indexed manufacturer, address indexed initialOwner, uint256 timestamp, uint256 warrantyDuration, uint256 claimLimit)",
  "event WarrantyActivated(uint256 indexed tokenId, address indexed customer, uint256 startTime, uint256 expirationTime)",
  "event WarrantyClaimSubmitted(uint256 indexed claimId, uint256 indexed tokenId, address indexed customer, string issueDescription, uint256 submittedAt)",
  "event WarrantyClaimProcessed(uint256 indexed claimId, uint256 indexed tokenId, address indexed serviceCenter, bool approved, uint256 processedAt)",
  "event ServiceRecorded(uint256 indexed tokenId, uint256 indexed claimId, address indexed serviceCenter, string serviceNotes, uint256 serviceDate)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

