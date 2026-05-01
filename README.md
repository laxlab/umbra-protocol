

**Confidential DeFi lending with sealed-bid liquidations on iExec Nox**

Built for the iExec Vibe Coding Challenge 2026 by Lax Lab

[![Network](https://img.shields.io/badge/Network-Arbitrum%20Sepolia-blue)](https://sepolia.arbiscan.io)
[![Nox](https://img.shields.io/badge/Powered%20by-iExec%20Nox%20ERC--7984-purple)](https://docs.iex.ec/nox-protocol)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What is Umbra Protocol?

Umbra Protocol is a DeFi lending protocol where your debt position is encrypted on-chain using iExec Nox's ERC-7984 confidential token standard. When you borrow USDC, the amount is stored as a `euint256` encrypted handle — a 32-byte ciphertext that only you can decrypt, using your wallet signature through the Nox JS SDK.

When a position becomes undercollateralized, instead of a public MEV gas war, a 1-hour sealed-bid auction starts. Liquidators submit bids privately. Nobody sees what others bid. The highest bid wins after the timer ends. Fair price for the borrower. No bots. No front-running.

---

## The Problem

Every lending position on Aave, Compound, and Spark is fully public. Your debt amount, your collateral, your health factor — all readable by anyone scanning the blockchain. MEV bots monitor these positions and race to liquidate you the moment your health drops. Borrowers receive worse prices. The liquidation process is chaotic and extractive.

Umbra Protocol fixes the debt privacy problem using iExec Nox, and fixes the liquidation fairness problem using sealed-bid auctions.

---

## Architecture
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
│   React + Vite + Tailwind CSS + ethers.js v6                │
│   @iexec-nox/handle JS SDK (decrypt debt balance)          │
│   Landing / Dashboard / Markets / Liquidation Board         │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│                  ARBITRUM SEPOLIA                            │
│                                                              │
│  UmbraOracle      UmbraVault       UmbraLiquidator          │
│  Chainlink feeds  depositCollateral  startAuction()         │
│  ETH/USD          borrow()           submitBid()            │
│  USDC/USD         repay()            settleAuction()        │
│  getHealthFactor  withdraw()         sealed 1hr auctions    │
│                   flagForLiquidation()                       │
│                        │                                     │
│                        │ mintDebt / burnDebt                 │
│                        ▼                                     │
│               UmbraDebtToken (ERC-7984)                     │
│               euint256 encrypted debt handles               │
│               Nox.toEuint256() / ERC7984 base               │
│               ACL: only holder can decrypt                  │
└──────────────────────────▲──────────────────────────────────┘
│ polls every 2 min
┌─────────────────────────────────────────────────────────────┐
│             BACKEND HEALTH MONITOR (Railway)                 │
│   Node.js service — scans depositors, checks health        │
│   Calls vault.flagForLiquidation() when HF < 100           │
└─────────────────────────────────────────────────────────────┘

---

## Confidentiality Model

| What | Standard DeFi | Umbra Protocol |
|---|---|---|
| Debt balance | Public `uint256` | Encrypted `euint256` — iExec Nox ERC-7984 |
| Who can decrypt | Anyone | Only position holder (EIP-712 wallet signature) |
| Collateral | Public | Public (encrypted division not in Nox v0.1.0) |
| Liquidation | Public MEV race | Sealed-bid 1-hour auction |

---

## iExec Nox Integration

When you borrow USDC, `UmbraVault` calls `UmbraDebtToken.mintDebt()`. Inside, `Nox.toEuint256(amount)` routes the value through the iExec TEE and stores an encrypted `euint256` handle on-chain. The ERC7984 base contract automatically grants ACL permission to the borrower's wallet.

When you click **Decrypt My Balance** on the Dashboard:

1. The Nox JS SDK creates a temporary RSA keypair in your browser
2. Your MetaMask signs a gasless EIP-712 message
3. The Nox KMS verifies you hold ACL permission on-chain
4. Your debt amount is decrypted locally — the plaintext never travels over the network

---

## Deployed Contracts — Arbitrum Sepolia

| Contract | Address |
|---|---|
| UmbraOracle | [`0x45E0a4C044C2A6c6aA3cE57cda7D5b03Ea386618`](https://sepolia.arbiscan.io/address/0x45E0a4C044C2A6c6aA3cE57cda7D5b03Ea386618) |
| UmbraVault | [`0x910cA875795Eb2AEE4fb344E178245F4f1804cad`](https://sepolia.arbiscan.io/address/0x910cA875795Eb2AEE4fb344E178245F4f1804cad) |
| UmbraLiquidator | [`0xA9A34763A240e194ee90C4E1Ae2BC3246505b604`](https://sepolia.arbiscan.io/address/0xA9A34763A240e194ee90C4E1Ae2BC3246505b604) |
| UmbraDebtToken (ERC-7984) | [`0x42f04AF3Ee51839ca381f6CdDA7b2Ad5ff3Adf66`](https://sepolia.arbiscan.io/address/0x42f04AF3Ee51839ca381f6CdDA7b2Ad5ff3Adf66) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Arbitrum Sepolia (chainId 421614) |
| Confidential Storage | iExec Nox — `euint256` encrypted types |
| Confidential Token | ERC-7984 via `@iexec-nox/nox-confidential-contracts` |
| Nox Solidity Library | `@iexec-nox/nox-protocol-contracts` — `Nox.toEuint256()`, ACL |
| JS Decryption SDK | `@iexec-nox/handle` — `createViemHandleClient`, `decrypt()` |
| Smart Contracts | Solidity 0.8.28 + OpenZeppelin v5 |
| Contract Tooling | Hardhat v3 |
| Contract Generation | ChainGPT Smart Contract Generator |
| Contract Audit | ChainGPT Smart Contract Auditor |
| Price Oracle | Chainlink (ETH/USD + USDC/USD on Arbitrum Sepolia) |
| Frontend | React + Vite + Tailwind CSS v3 |
| Wallet | ethers.js v6 + MetaMask |
| Backend Monitor | Node.js — Railway |
| Frontend Hosting | Netlify |

---

## Project Structure
umbra-protocol/
├── contracts/
│   ├── UmbraOracle.sol        Chainlink price wrapper (48h staleness for testnet)
│   ├── UmbraVault.sol         Core lending vault — integrates UmbraDebtToken
│   ├── UmbraLiquidator.sol    Sealed-bid liquidation auctions
│   └── UmbraDebtToken.sol     iExec Nox ERC-7984 confidential debt token
│                              euint256 storage, Nox.toEuint256(), ERC7984 base
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx         Landing with particle animation
│   │   │   ├── Dashboard.jsx       Position management + Nox decrypt
│   │   │   ├── Markets.jsx         Live Chainlink prices terminal
│   │   │   └── LiquidationBoard.jsx Auction board with countdown timers
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   ├── context/
│   │   │   └── WalletContext.jsx   MetaMask + Arbitrum Sepolia auto-switch
│   │   └── lib/
│   │       ├── contracts.js        ABIs + deployed addresses
│   │       └── txHelpers.js        Gas overrides + human error messages
│   └── public/favicon.svg
├── backend/
│   └── src/monitor.js         TEE health monitor (Railway, always-on)
├── scripts/
│   ├── deploy.js              Deploys and wires all 4 contracts
│   └── fundReserve.js         Seeds USDC lending reserve
├── audit-report.md            ChainGPT audit — 0 critical findings
└── feedback.md                iExec developer experience

---

## Local Setup

### Requirements
- Node.js v20+
- MetaMask browser extension
- Testnet ETH from [cdefi.iex.ec](https://cdefi.iex.ec)

### Install

```bash
git clone https://github.com/laxonaunt/umbra-protocol.git
cd umbra-protocol
npm install
cp .env.example .env
# Add your PRIVATE_KEY and contract addresses to .env
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Run Backend Monitor

```bash
node backend/src/monitor.js
```

### Redeploy Contracts

```bash
npx hardhat compile
node scripts/deploy.js
node scripts/fundReserve.js
```

---

## Security

- OpenZeppelin `ReentrancyGuard` on all state-changing functions
- Chainlink 48-hour staleness window for testnet reliability
- `setVault()` and `setDebtToken()` — one-time initialization, permanently locked
- `fallback()` reverts to prevent accidental ETH acceptance
- `onlyPositionHolder` — position readable only by holder or owner
- Nox ACL — encrypted debt handle decryptable only by borrower wallet
- ChainGPT audit — zero critical vulnerabilities — see [audit-report.md](./audit-report.md)

---

## Links

- **Live App:** https://umbra-protocol.netlify.app
- **iExec Nox Docs:** https://docs.iex.ec/nox-protocol
- **ChainGPT:** https://app.chaingpt.org
- **Audit Report:** [audit-report.md](./audit-report.md)

---

*A Lax Lab product — iExec Vibe Coding Challenge 2026*