import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const VAULT_ADDRESS = "0x910cA875795Eb2AEE4fb344E178245F4f1804cad";
const USDC_ADDRESS  = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];
const VAULT_ABI = [
  "function fundReserve(uint256 amount) external",
  "function usdcReserve() external view returns (uint256)",
];

const usdc  = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

const balance = await usdc.balanceOf(wallet.address);
console.log("Your USDC balance:", (Number(balance) / 1e6).toFixed(2), "USDC");

if (balance === 0n) {
  console.error("No USDC found. Get some from https://faucet.circle.com (select Arbitrum Sepolia)");
  process.exit(1);
}

const amount = balance / 2n;
console.log("Funding reserve with:", (Number(amount) / 1e6).toFixed(2), "USDC");

console.log("Step 1/2: Approving vault to spend USDC...");
const approveTx = await usdc.approve(VAULT_ADDRESS, amount);
await approveTx.wait();
console.log("Approved.");

console.log("Step 2/2: Calling fundReserve...");
const fundTx = await vault.fundReserve(amount);
await fundTx.wait();

const reserve = await vault.usdcReserve();
console.log("Reserve funded. Current reserve:", (Number(reserve) / 1e6).toFixed(2), "USDC");