import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const REQUIRED = ["PRIVATE_KEY", "ORACLE_ADDRESS", "VAULT_ADDRESS", "LIQUIDATOR_ADDRESS"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const ADDRESSES = {
  oracle:     process.env.ORACLE_ADDRESS,
  vault:      process.env.VAULT_ADDRESS,
  liquidator: process.env.LIQUIDATOR_ADDRESS,
};

const ORACLE_ABI = [
  "function getETHPrice() external view returns (uint256)",
  "function getUSDCPrice() external view returns (uint256)",
  "function getHealthFactor(uint256 collateralAmountETH, uint256 debtAmountUSDC) external view returns (uint256)",
];

const VAULT_ABI = [
  "function getPosition(address user) external view returns (uint256 collateralAmountETH, uint256 debtAmountUSDC, uint256 lastInterestUpdate, bool isLiquidatable)",
  "function flagForLiquidation(address user) external",
  "function usdcReserve() external view returns (uint256)",
  "event CollateralDeposited(address indexed user, uint256 amountETH)",
  "event LiquidationFlagged(address indexed user)",
];

const LIQUIDATOR_ABI = [
  "function getAuction(address borrower) external view returns (tuple(address borrower, uint256 startTime, uint256 endTime, bool settled, address winner, uint256 winningBid, uint256 bidCount))",
  "event AuctionStarted(address indexed borrower, uint256 endTime)",
  "event AuctionSettled(address indexed borrower, address indexed winner, uint256 winningBid)",
];

const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const oracle     = new ethers.Contract(ADDRESSES.oracle,     ORACLE_ABI,     wallet);
const vault      = new ethers.Contract(ADDRESSES.vault,      VAULT_ABI,      wallet);
const liquidator = new ethers.Contract(ADDRESSES.liquidator, LIQUIDATOR_ABI, wallet);

const knownUsers   = new Set();
const POLL_MS      = 2 * 60 * 1000;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function getOverrides() {
  try {
    const gasPriceHex = await provider.send('eth_gasPrice', []);
    const gasPrice    = BigInt(gasPriceHex);
    const buffered    = gasPrice * 130n / 100n;
    return { gasPrice: buffered, gasLimit: 500000n };
  } catch {
    return { gasPrice: 200000000n, gasLimit: 500000n };
  }
}

async function discoverUsers() {
  try {
    const latest = await provider.getBlockNumber();
    const from   = Math.max(0, latest - 100000);
    const events = await vault.queryFilter(vault.filters.CollateralDeposited(), from, latest);
    let added = 0;
    for (const ev of events) {
      const user = ev.args[0];
      if (!knownUsers.has(user)) { knownUsers.add(user); added++; }
    }
    if (added > 0) log(`[Discovery] +${added} new users. Total: ${knownUsers.size}`);
  } catch (err) {
    log(`[Discovery] Error: ${err.message}`);
  }
}

async function checkPositions() {
  if (knownUsers.size === 0) {
    log("[Monitor] No users yet. Waiting for deposits...");
    return;
  }
  log(`[Monitor] Checking ${knownUsers.size} position(s)...`);
  for (const user of knownUsers) {
    try {
      const pos          = await vault.getPosition(user);
      const collateral   = pos[0];
      const debt         = pos[1];
      const isLiquidatable = pos[3];

      if (debt === 0n) continue;

      const hf = await oracle.getHealthFactor(collateral, debt);
      log(`[Position] ${user.slice(0,6)}...${user.slice(-4)} | HF: ${hf}`);

      if (hf < 100n && !isLiquidatable) {
        log(`  ⚠️  Flagging for liquidation...`);
        const overrides = await getOverrides();
        const tx = await vault.flagForLiquidation(user, overrides);
        await tx.wait();
        log(`  ✅ Flagged.`);
      }
    } catch (err) {
      log(`  [Skip] ${user.slice(0,6)}...: ${err.message}`);
    }
  }
}

function startListeners() {
  vault.on("CollateralDeposited", (user) => {
    if (!knownUsers.has(user)) { knownUsers.add(user); log(`[Event] New depositor: ${user}`); }
  });
  vault.on("LiquidationFlagged", (user) => { log(`[Event] LiquidationFlagged: ${user}`); });
  liquidator.on("AuctionSettled", (borrower, winner, winningBid) => {
    log(`[Event] Auction settled. Winner: ${winner} | Bid: ${(Number(winningBid)/1e6).toFixed(2)} USDC`);
  });
  log("[Events] Listening...");
}

async function run() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Umbra Protocol — Health Monitor v1.0");
  console.log("═══════════════════════════════════════════════");
  console.log("  Oracle:    ", ADDRESSES.oracle);
  console.log("  Vault:     ", ADDRESSES.vault);
  console.log("  Liquidator:", ADDRESSES.liquidator);
  console.log("═══════════════════════════════════════════════\n");

  try {
    const block = await provider.getBlockNumber();
    log(`[Init] Connected. Block: ${block}`);
  } catch {
    log("[Init] Cannot connect to RPC.");
    process.exit(1);
  }

  const balance = await provider.getBalance(wallet.address);
  log(`[Init] Monitor wallet: ${wallet.address}`);
  log(`[Init] Balance: ${ethers.formatEther(balance)} ETH`);

  await discoverUsers();
  startListeners();
  await checkPositions();

  setInterval(async () => {
    await discoverUsers();
    await checkPositions();
  }, POLL_MS);

  log(`\n[Monitor] Running. Polls every 2 min.\n`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});