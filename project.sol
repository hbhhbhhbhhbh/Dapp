// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/utils/Counters.sol"; // ❌ 已不再使用 Counters，节省 gas

/**
 * @title Product Contract (Gas Optimized)
 * @dev 管理产品生命周期、所有权和保修。
 * 包含三大主要优化：
 *   ① 替换 Counters.Counter → 原生 uint256
 *   ② 替换 mapping(string) → mapping(bytes32)
 *   ③ 压缩结构体字段（Storage Packing）
 *   ④ 使用 Custom Errors 替代 require(string) 报错，进一步减少部署和运行 gas
 */
contract Product is ERC721, AccessControl {

    // ============================================================================
    // ✅ Error 优化修改点：定义自定义错误（Custom Errors）
    // ============================================================================
    error SerialNumberEmpty(string message);
    error SerialNumberExists(string message);
    error ZeroAddress(string message);
    error NotRetailer(string message);
    error WarrantyAlreadyActivated();
    error NotOwner();
    error WarrantyNotActivated();
    error WarrantyExpired();
    error ClaimLimitReached();
    error IssueDescriptionEmpty();
    error ClaimNotExist();
    error ClaimAlreadyProcessed();
    error ClaimNotApproved();
    error ServiceAlreadyRecorded();
    error ServiceNotesEmpty();
    error ProductNotRegistered();

    // ============================================================================
    // ✅ 数据结构（Storage 压缩优化）
    // ============================================================================
    struct ProductDetails {
        string serialNumber;
        string model;
        address manufacturer;

        // ✅ Gas 优化修改点 ⑥：压缩时间与计数字段（原 6 个 uint256 → 4×uint64 + 2×uint32）
        //    减少存储槽使用（从 6 slot → 2 slot），节省大量 SSTORE 成本
        uint64 manufactureTimestamp;  // 生产时间
        uint64 warrantyDuration;      // 保修期（秒）
        uint64 warrantyStart;         // 保修开始时间
        uint64 warrantyExpiration;    // 保修结束时间
        uint32 warrantyClaimLimit;    // 索赔上限
        uint32 warrantyClaimCount;    // 当前索赔次数
    }

    struct WarrantyClaim {
        uint256 tokenId;
        address customer;
        string issueDescription;
        uint64 submittedAt; // ✅ 时间类字段也可压缩至 uint64
        bool processed;
        bool approved;
        string serviceNotes;
        uint64 processedAt; // ✅ 同上
    }

    // ============================================================================
    // 角色定义
    // ============================================================================
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant SERVICE_CENTER_ROLE = keccak256("SERVICE_CENTER_ROLE");

    // ============================================================================
    // 状态变量
    // ============================================================================
    // ✅ 优化点①：使用原生 uint256 替代 Counters.Counter，减少 SLOAD/SSTORE
    uint256 private _tokenIdCounter = 1;
    uint256 private _claimIdCounter = 1;

    // ✅ 优化点②：改用 bytes32 哈希键减少动态字符串哈希 gas
    mapping(bytes32 => uint256) public tokenIdForSerialHash;

    // Token ID => 产品信息
    mapping(uint256 => ProductDetails) public productDetails;

    // 保修索赔 ID => 索赔详情
    mapping(uint256 => WarrantyClaim) public warrantyClaims;

    // ============================================================================
    // 事件
    // ============================================================================
    event ProductRegistered(
        uint256 indexed tokenId,
        string serialNumber,
        string model,
        address indexed manufacturer,
        address indexed initialOwner,
        uint64 timestamp,
        uint64 warrantyDuration,
        uint32 claimLimit
    );

    event WarrantyActivated(
        uint256 indexed tokenId,
        address indexed customer,
        uint64 startTime,
        uint64 expirationTime
    );

    event WarrantyClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed tokenId,
        address indexed customer,
        string issueDescription,
        uint64 submittedAt
    );

    event WarrantyClaimProcessed(
        uint256 indexed claimId,
        uint256 indexed tokenId,
        address indexed serviceCenter,
        bool approved,
        uint64 processedAt
    );

    event ServiceRecorded(
        uint256 indexed tokenId,
        uint256 indexed claimId,
        address indexed serviceCenter,
        string serviceNotes,
        uint64 serviceDate
    );

    // ============================================================================
    // 构造函数
    // ============================================================================
    constructor() ERC721("ProductProvenance", "PROD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, msg.sender);
        _grantRole(RETAILER_ROLE, msg.sender);
        _grantRole(SERVICE_CENTER_ROLE, msg.sender);
    }

    // 解决多继承接口冲突
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
function test(bytes32 keyHash)public returns (bytes32 num){
        return keyHash;
    }
    // ============================================================================
    // 制造商功能
    // ============================================================================
    function registerProduct(
        address initialOwner,
        string calldata serialNumber,
        string calldata model,
        uint64 warrantyDurationInSeconds,
        uint32 claimLimit
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        // ✅ Error 优化修改点：使用 revert + Custom Error 替代 require(string)
        if (bytes(serialNumber).length == 0) revert SerialNumberEmpty("serialnumber empty");

        // ✅ 优化点③：使用 bytes32 哈希作为 key
        bytes32 serialHash = keccak256(bytes(serialNumber));
        if (tokenIdForSerialHash[serialHash] != 0) revert SerialNumberExists("serialnumber already exists");

        if (initialOwner == address(0)) revert ZeroAddress("address equals to zero");
        if (!hasRole(RETAILER_ROLE, initialOwner)) revert NotRetailer("not retailer");

        // ✅ 优化点④：直接使用 ++ 自增
        uint256 newItemId = _tokenIdCounter++;

        productDetails[newItemId] = ProductDetails({
            serialNumber: serialNumber,
            model: model,
            manufacturer: msg.sender,
            manufactureTimestamp: uint64(block.timestamp),
            warrantyDuration: warrantyDurationInSeconds,
            warrantyClaimLimit: claimLimit,
            warrantyStart: 0,
            warrantyExpiration: 0,
            warrantyClaimCount: 0
        });

        tokenIdForSerialHash[serialHash] = newItemId;
        _safeMint(initialOwner, newItemId);

        emit ProductRegistered(
            newItemId,
            serialNumber,
            model,
            msg.sender,
            initialOwner,
            uint64(block.timestamp),
            warrantyDurationInSeconds,
            claimLimit
        );

        return newItemId;
    }

    // ============================================================================
    // 所有权转移与保修自动激活
    // ============================================================================
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);

        if (
            from != address(0) &&
            hasRole(RETAILER_ROLE, from) &&
            !hasRole(RETAILER_ROLE, to) &&
            to != address(0) &&
            productDetails[tokenId].warrantyStart == 0
        ) {
            _activateWarranty(tokenId, to);
        }

        return previousOwner;
    }

    function _activateWarranty(uint256 tokenId, address customer) internal {
        ProductDetails storage product = productDetails[tokenId];
        // ✅ Error 优化修改点
        if (product.warrantyStart != 0) revert WarrantyAlreadyActivated();

        product.warrantyStart = uint64(block.timestamp);
        product.warrantyExpiration = uint64(block.timestamp + product.warrantyDuration);

        emit WarrantyActivated(
            tokenId,
            customer,
            product.warrantyStart,
            product.warrantyExpiration
        );
    }

    // ============================================================================
    // 客户功能
    // ============================================================================
    function submitWarrantyClaim(
        uint256 tokenId,
        string calldata issueDescription
    ) external returns (uint256) {
        // ✅ Error 优化修改点
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        ProductDetails storage product = productDetails[tokenId];

        if (product.warrantyStart == 0) revert WarrantyNotActivated();
        if (block.timestamp > product.warrantyExpiration) revert WarrantyExpired();
        if (product.warrantyClaimCount >= product.warrantyClaimLimit) revert ClaimLimitReached();
        if (bytes(issueDescription).length == 0) revert IssueDescriptionEmpty();

        product.warrantyClaimCount++;
        uint256 newClaimId = _claimIdCounter++;

        warrantyClaims[newClaimId] = WarrantyClaim({
            tokenId: tokenId,
            customer: _ownerOf(tokenId),
            issueDescription: issueDescription,
            submittedAt: uint64(block.timestamp),
            processed: false,
            approved: false,
            serviceNotes: "",
            processedAt: 0
        });

        emit WarrantyClaimSubmitted(
            newClaimId,
            tokenId,
            _ownerOf(tokenId),
            issueDescription,
            uint64(block.timestamp)
        );
        return newClaimId;
    }

    // ============================================================================
    // 服务中心功能
    // ============================================================================
    function processWarrantyClaim(uint256 claimId, bool approved)
        external
        onlyRole(SERVICE_CENTER_ROLE)
    {
        WarrantyClaim storage claim = warrantyClaims[claimId];
        // ✅ Error 优化修改点
        if (claim.tokenId == 0) revert ClaimNotExist();
        if (claim.processed) revert ClaimAlreadyProcessed();

        claim.processed = true;
        claim.approved = approved;
        claim.processedAt = uint64(block.timestamp);

        emit WarrantyClaimProcessed(
            claimId,
            claim.tokenId,
            msg.sender,
            approved,
            uint64(block.timestamp)
        );
    }

    function recordService(uint256 claimId, string calldata serviceNotes)
        external
        onlyRole(SERVICE_CENTER_ROLE)
    {
        WarrantyClaim storage claim = warrantyClaims[claimId];
        // ✅ Error 优化修改点
        if (claim.tokenId == 0) revert ClaimNotExist();
        if (!(claim.processed && claim.approved)) revert ClaimNotApproved();
        if (bytes(claim.serviceNotes).length != 0) revert ServiceAlreadyRecorded();
        if (bytes(serviceNotes).length == 0) revert ServiceNotesEmpty();

        claim.serviceNotes = serviceNotes;

        emit ServiceRecorded(
            claim.tokenId,
            claimId,
            msg.sender,
            serviceNotes,
            uint64(block.timestamp)
        );
    }

    // ============================================================================
    // 查询函数
    // ============================================================================
    function getProductDetails(uint256 tokenId)
        external
        view
        returns (ProductDetails memory)
    {
        // ✅ Error 优化修改点
        if (productDetails[tokenId].manufactureTimestamp == 0) revert ProductNotRegistered();
        return productDetails[tokenId];
    }

    function getWarrantyClaim(uint256 claimId)
        external
        view
        returns (WarrantyClaim memory)
    {
        // ✅ Error 优化修改点
        if (warrantyClaims[claimId].tokenId == 0) revert ClaimNotExist();
        return warrantyClaims[claimId];
    }

    function isWarrantyActive(uint256 tokenId)
        external
        view
        returns (bool)
    {
        // ✅ Error 优化修改点
        if (productDetails[tokenId].manufactureTimestamp == 0) revert ProductNotRegistered();
        ProductDetails memory product = productDetails[tokenId];
        return
            product.warrantyStart > 0 &&
            block.timestamp <= product.warrantyExpiration &&
            product.warrantyClaimCount < product.warrantyClaimLimit;
    }
}
