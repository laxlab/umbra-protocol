export const ADDRESSES = {
  oracle:     '0x45E0a4C044C2A6c6aA3cE57cda7D5b03Ea386618',
  vault:      '0x910cA875795Eb2AEE4fb344E178245F4f1804cad',
  liquidator: '0xA9A34763A240e194ee90C4E1Ae2BC3246505b604',
  usdc:       '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  debtToken:  '0x42f04AF3Ee51839ca381f6CdDA7b2Ad5ff3Adf66',
}

export const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc'

export const ABIS = {
  oracle: [
    'function getETHPrice() external view returns (uint256)',
    'function getUSDCPrice() external view returns (uint256)',
    'function getHealthFactor(uint256 collateralAmountETH, uint256 debtAmountUSDC) external view returns (uint256)',
    'error StalePrice(string feed, uint256 updatedAt, uint256 currentTime)',
  ],

  vault: [
    'function depositCollateral() external payable',
    'function withdrawCollateral(uint256 amount) external',
    'function borrow(uint256 amount) external',
    'function repay(uint256 amount) external',
    'function getPosition(address user) external view returns (uint256 collateralAmountETH, uint256 debtAmountUSDC, uint256 lastInterestUpdate, bool isLiquidatable)',
    'function flagForLiquidation(address user) external',
    'function accrueInterest(address user) external',
    'function usdcReserve() external view returns (uint256)',
    'function fundReserve(uint256 amount) external',
    'event CollateralDeposited(address indexed user, uint256 amountETH)',
    'event CollateralWithdrawn(address indexed user, uint256 amountETH)',
    'event Borrowed(address indexed user, uint256 amountUSDC)',
    'event Repaid(address indexed user, uint256 amountUSDC)',
    'event LiquidationFlagged(address indexed user)',
    'error InsufficientCollateral()',
    'error PositionUnhealthy()',
    'error InsufficientReserve()',
    'error ZeroAmount()',
    'error NotLiquidatable()',
    'error NotPositionHolder()',
  ],

  liquidator: [
    'function getAuction(address borrower) external view returns (tuple(address borrower, uint256 startTime, uint256 endTime, bool settled, address winner, uint256 winningBid, uint256 bidCount))',
    'function submitBid(address borrower, uint256 bidAmount) external',
    'function settleAuction(address borrower) external',
    'function getAuctionBidIds(address borrower) external view returns (bytes32[])',
    'function setVault(address _vault) external',
    'event AuctionStarted(address indexed borrower, uint256 endTime)',
    'event BidSubmitted(address indexed borrower, address indexed bidder, bytes32 bidId)',
    'event AuctionSettled(address indexed borrower, address indexed winner, uint256 winningBid)',
    'error AuctionNotActive()',
    'error AuctionAlreadySettled()',
    'error AuctionNotEnded()',
    'error AuctionAlreadyExists()',
    'error OnlyVault()',
    'error VaultAlreadyLocked()',
    'error ZeroAddress()',
  ],

  erc20: [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
  ],

  debtToken: [
    'function mintDebt(address user, uint256 amount) external',
    'function burnDebt(address user, uint256 amount) external',
    'function getEncryptedDebt(address user) external view returns (bytes32)',
    'function hasDebt(address user) external view returns (bool)',
    'event DebtMinted(address indexed user)',
    'event DebtBurned(address indexed user)',
  ],
}
