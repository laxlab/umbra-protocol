// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title UmbraLiquidator - Sealed-bid liquidation auctions for UmbraVault on Arbitrum Sepolia
/// @notice Handles confidential liquidation auctions for unhealthy lending positions
/// @author ChainGPT (base) + Umbra Protocol (OZ v5 import fix)
/// @dev Only the UmbraVault contract can start auctions

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract UmbraLiquidator is Ownable, ReentrancyGuard {

    /// @notice Auction struct containing auction details
    struct Auction {
        address borrower;
        uint256 startTime;
        uint256 endTime;
        bool    settled;
        address winner;
        uint256 winningBid;
        uint256 bidCount;
    }

    /// @notice Address of the authorized UmbraVault contract
    address public immutable vaultAddress;

    /// @notice Mapping of borrower => Auction
    mapping(address => Auction) public auctions;

    /// @notice Mapping of bidId => bid amount
    mapping(bytes32 => uint256) public bids;

    /// @notice Mapping of bidId => bidder address
    mapping(bytes32 => address) public bidder;

    /// @notice Mapping of borrower => array of bidIds for their auction
    mapping(address => bytes32[]) public auctionBids;

    // ========== EVENTS ==========

    event AuctionStarted(address indexed borrower, uint256 endTime);
    event BidSubmitted(address indexed borrower, address indexed bidder, bytes32 bidId);
    event AuctionSettled(address indexed borrower, address indexed winner, uint256 winningBid);

    // ========== ERRORS ==========

    error AuctionNotActive();
    error AuctionAlreadySettled();
    error AuctionNotEnded();
    error AuctionAlreadyExists();
    error OnlyVault();

    // ========== CONSTRUCTOR ==========

    /// @param _vaultAddress The address of the UmbraVault contract
    constructor(address _vaultAddress) Ownable(msg.sender) {
        require(_vaultAddress != address(0), "Vault address zero");
        vaultAddress = _vaultAddress;
    }

    // ========== MODIFIERS ==========

    modifier onlyVault() {
        if (msg.sender != vaultAddress) revert OnlyVault();
        _;
    }

    // ========== CORE LOGIC ==========

    /// @notice Called by the vault to start a liquidation auction for a borrower
    /// @param borrower The borrower whose position is being liquidated
    function startAuction(address borrower) external onlyVault {
        Auction storage auction = auctions[borrower];
        if (auction.startTime != 0 && !auction.settled) revert AuctionAlreadyExists();

        uint256 start = block.timestamp;
        uint256 end   = start + 1 hours;

        auctions[borrower] = Auction({
            borrower:   borrower,
            startTime:  start,
            endTime:    end,
            settled:    false,
            winner:     address(0),
            winningBid: 0,
            bidCount:   0
        });

        emit AuctionStarted(borrower, end);
    }

    /// @notice Submit a sealed bid for a borrower's auction
    /// @param borrower   The borrower whose auction you are bidding on
    /// @param bidAmount  The bid amount
    function submitBid(address borrower, uint256 bidAmount) external nonReentrant {
        Auction storage auction = auctions[borrower];

        if (
            auction.startTime == 0 ||
            block.timestamp >= auction.endTime ||
            auction.settled
        ) revert AuctionNotActive();

        uint256 bidCount = auction.bidCount;
        bytes32 bidId = keccak256(abi.encodePacked(borrower, msg.sender, bidCount));

        bids[bidId]   = bidAmount;
        bidder[bidId] = msg.sender;
        auctionBids[borrower].push(bidId);
        auction.bidCount = bidCount + 1;

        emit BidSubmitted(borrower, msg.sender, bidId);
    }

    /// @notice Settle an auction after it ends — finds the highest bid and winner
    /// @param borrower The borrower whose auction to settle
    function settleAuction(address borrower) external nonReentrant {
        Auction storage auction = auctions[borrower];

        if (auction.startTime == 0)              revert AuctionNotActive();
        if (auction.settled)                     revert AuctionAlreadySettled();
        if (block.timestamp < auction.endTime)   revert AuctionNotEnded();

        bytes32[] storage bidIds = auctionBids[borrower];

        address winner     = address(0);
        uint256 winningBid = 0;

        for (uint256 i = 0; i < bidIds.length; ++i) {
            uint256 amount = bids[bidIds[i]];
            if (amount > winningBid) {
                winningBid = amount;
                winner     = bidder[bidIds[i]];
            }
        }

        auction.winner     = winner;
        auction.winningBid = winningBid;
        auction.settled    = true;

        emit AuctionSettled(borrower, winner, winningBid);
    }

    // ========== VIEW FUNCTIONS ==========

    /// @notice Get auction details for a borrower
    function getAuction(address borrower) external view returns (Auction memory) {
        return auctions[borrower];
    }

    /// @notice Get the bid amount for a given bidId
    function getBid(bytes32 bidId) external view returns (uint256) {
        return bids[bidId];
    }

    /// @notice Get all bidIds for a borrower's auction
    function getAuctionBidIds(address borrower) external view returns (bytes32[] memory) {
        return auctionBids[borrower];
    }
}