// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MonopolyAssets is ERC1155, Ownable, ReentrancyGuard {

    enum AssetType { PROPERTY, STATION, UTILITY, HOUSE, HOTEL }

    uint256 public constant COOLDOWN_SECONDS = 5 minutes;
    uint256 public constant LOCK_SECONDS = 10 minutes;
    uint256 public constant MAX_UNIQUE_RESOURCES = 4;

    mapping(address => uint256) public lastActionAt;
    mapping(address => mapping(uint256 => uint256)) public lockedUntil;

    mapping(address => uint256) public uniqueOwnedCount;
    mapping(address => mapping(uint256 => bool)) private _ownsId;

    bool private _inTrade;

    struct AssetInfo {
        string name;
        AssetType assetType;
        uint256 value;
        string ipfsHash;
        uint256 createdAt;
        uint256 lastTransferAt;
    }

    uint256 private nextTokenId = 1;
    mapping(uint256 => AssetInfo) private assets;
    mapping(uint256 => address[]) private _previousOwners;

    event AssetCreated(uint256 indexed tokenId, string name, AssetType assetType, uint256 value, string ipfsHash);
    event AssetBought(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 paid);
    event TradeExecuted(address indexed from, address indexed to, uint256 idGive, uint256 amountGive, uint256 idReceive, uint256 amountReceive);

    constructor() ERC1155("") Ownable(msg.sender) {}

    /* ---------------------------- ADMIN ---------------------------- */

    function createAsset(
        string calldata name,
        AssetType assetType,
        uint256 value,
        string calldata ipfsHash
    ) external onlyOwner returns (uint256 tokenId) {
        require(bytes(name).length > 0, "Name required");
        require(value > 0, "Value must be > 0");
        require(bytes(ipfsHash).length > 0, "IPFS required");

        tokenId = nextTokenId++;
        assets[tokenId] = AssetInfo(name, assetType, value, ipfsHash, block.timestamp, 0);

        emit AssetCreated(tokenId, name, assetType, value, ipfsHash);
    }

    /* ---------------------------- READ ---------------------------- */

    function getNextTokenId() external view returns (uint256) {
        return nextTokenId;
    }

    function getAsset(uint256 tokenId) external view returns (AssetInfo memory) {
        require(assets[tokenId].createdAt != 0, "Asset not found");
        return assets[tokenId];
    }

    function getPreviousOwners(uint256 tokenId) external view returns (address[] memory) {
        return _previousOwners[tokenId];
    }

    /* ---------------------------- BUY ---------------------------- */

    function buyAsset(uint256 tokenId) external payable nonReentrant {
        require(assets[tokenId].createdAt != 0, "Asset not found");
        require(msg.value == assets[tokenId].value, "Incorrect payment");

        _mint(msg.sender, tokenId, 1, "");
        (bool ok,) = owner().call{value: msg.value}("");
        require(ok, "Payment failed");

        emit AssetBought(msg.sender, tokenId, 1, msg.value);
    }

    /* ---------------------------- SAFE TRANSFER OVERRIDE ---------------------------- */

function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
) public override {

    if (!_inTrade && from != address(0)) {

        // Cooldown métier
        require(
            block.timestamp >= lastActionAt[from] + COOLDOWN_SECONDS,
            "Cooldown not passed"
        );

        // Lock après réception
        require(
            block.timestamp >= lockedUntil[from][id],
            "Token is locked"
        );
    }

    super.safeTransferFrom(from, to, id, amount, data);
}




    /* ---------------------------- TRADE ---------------------------- */

    function trade(
        address counterparty,
        uint256 idGive,
        uint256 amountGive,
        uint256 idReceive,
        uint256 amountReceive
    ) external {

        require(counterparty != msg.sender, "Same address");

        require(isApprovedForAll(msg.sender, address(this)), "Sender not approved");
        require(isApprovedForAll(counterparty, address(this)), "Counterparty not approved");

        uint256 giveValue = assets[idGive].value * amountGive;
        uint256 receiveValue = assets[idReceive].value * amountReceive;
        require(giveValue == receiveValue, "Trade not fair");

        _inTrade = true;

        _safeTransferFrom(msg.sender, counterparty, idGive, amountGive, "");
        _safeTransferFrom(counterparty, msg.sender, idReceive, amountReceive, "");

        _inTrade = false;

        emit TradeExecuted(msg.sender, counterparty, idGive, amountGive, idReceive, amountReceive);
    }

    /* ---------------------------- ERC1155 HOOK ---------------------------- */

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override {

        super._update(from, to, ids, amounts);

        if (from != address(0)) lastActionAt[from] = block.timestamp;
        if (to != address(0)) lastActionAt[to] = block.timestamp;

        for (uint256 i = 0; i < ids.length; i++) {
            assets[ids[i]].lastTransferAt = block.timestamp;

            if (from != address(0) && to != address(0)) {
                _previousOwners[ids[i]].push(from);
            }

            if (to != address(0)) {
                lockedUntil[to][ids[i]] = block.timestamp + LOCK_SECONDS;
            }

            _afterBalanceChange(from, ids[i]);
            _afterBalanceChange(to, ids[i]);
        }
    }

    function _afterBalanceChange(address user, uint256 id) internal {
        if (user == address(0)) return;

        uint256 bal = balanceOf(user, id);
        bool owns = _ownsId[user][id];

        if (!owns && bal > 0) {
            require(uniqueOwnedCount[user] + 1 <= MAX_UNIQUE_RESOURCES, "Max resources reached");
            _ownsId[user][id] = true;
            uniqueOwnedCount[user]++;
        }

        if (owns && bal == 0) {
            _ownsId[user][id] = false;
            uniqueOwnedCount[user]--;
        }
    }
}
