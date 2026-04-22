import { ethers } from "ethers";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

// ── Load compiled artifacts ────────────────────────────────────────────
function loadArtifact(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const OracleArtifact     = loadArtifact("./artifacts/contracts/UmbraOracle.sol/UmbraOracle.json");
const VaultArtifact      = loadArtifact("./artifacts/contracts/UmbraVault.sol/UmbraVault.json");
const LiquidatorArtifact = loadArtifact("./artifacts/contracts/UmbraLiquidator.sol/UmbraLiquidator.json");

// ── Setup provider and wallet ──────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc"
);

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not found in .env file");
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

console.log("Deploying Umbra Protocol to Arbitrum Sepolia...");
console.log("Deployer address:", wallet.address);

const balance = await provider.getBalance(wallet.address);
console.log("Balance:", ethers.formatEther(balance), "ETH\n");

if (balance === 0n) {
  throw new Error("Deployer has no ETH. Get testnet ETH from https://cdefi.iex.ec/");
}

// ── 1. Deploy UmbraOracle ──────────────────────────────────────────────
console.log("[1/3] Deploying UmbraOracle...");

const ETH_USD_FEED  = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165";
const USDC_USD_FEED = "0x0153002d20B96532C639313c2d54c3dA09109309";

const OracleFactory = new ethers.ContractFactory(
  OracleArtifact.abi,
  OracleArtifact.bytecode,
  wallet
);
const oracle = await OracleFactory.deploy(ETH_USD_FEED, USDC_USD_FEED);
await oracle.waitForDeployment();
const oracleAddress = await oracle.getAddress();
console.log("UmbraOracle deployed to:", oracleAddress);

// ── 2. Deploy UmbraVault ───────────────────────────────────────────────
console.log("\n[2/3] Deploying UmbraVault...");

const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

const VaultFactory = new ethers.ContractFactory(
  VaultArtifact.abi,
  VaultArtifact.bytecode,
  wallet
);
const vault = await VaultFactory.deploy(oracleAddress, USDC_ADDRESS);
await vault.waitForDeployment();
const vaultAddress = await vault.getAddress();
console.log("UmbraVault deployed to:", vaultAddress);

// ── 3. Deploy UmbraLiquidator ──────────────────────────────────────────
console.log("\n[3/3] Deploying UmbraLiquidator...");

const LiquidatorFactory = new ethers.ContractFactory(
  LiquidatorArtifact.abi,
  LiquidatorArtifact.bytecode,
  wallet
);
const liquidator = await LiquidatorFactory.deploy(vaultAddress);
await liquidator.waitForDeployment();
const liquidatorAddress = await liquidator.getAddress();
console.log("UmbraLiquidator deployed to:", liquidatorAddress);

// ── Summary ────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════");
console.log("DEPLOYMENT COMPLETE");
console.log("═══════════════════════════════════════════");
console.log("UmbraOracle:     ", oracleAddress);
console.log("UmbraVault:      ", vaultAddress);
console.log("UmbraLiquidator: ", liquidatorAddress);
console.log("Network:          Arbitrum Sepolia (chainId 421614)");
console.log("Deployer:        ", wallet.address);
console.log("═══════════════════════════════════════════");
console.log("\nSave these addresses. You need them for the frontend.");