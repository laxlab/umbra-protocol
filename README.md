# Umbra Protocol

> Confidential DeFi lending with sealed-bid liquidations — built on iExec Nox

**iExec Vibe Coding Challenge 2026**

[![Network](https://img.shields.io/badge/Network-Arbitrum%20Sepolia-blue)](https://sepolia.arbiscan.io)
[![Nox](https://img.shields.io/badge/Powered%20by-iExec%20Nox-purple)](https://docs.iex.ec/nox-protocol)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Overview

Umbra Protocol is a confidential DeFi lending protocol where debt positions are encrypted on-chain using iExec Nox's ERC-7984 standard. Users deposit ETH as collateral, borrow USDC, and their debt balance is stored as an encrypted handle — invisible to everyone on the blockchain except the position holder.

When a position becomes undercollateralized, instead of the usual MEV chaos, liquidators submit sealed bids inside a 1-hour auction. No gas wars. No front-running. Fair price for the borrower.

---

## The Problem

Every lending position on Aave, Compound, and Spark is fully public. Your collateral amount, your debt, your health factor — all readable by anyone scanning the blockchain. MEV bots monitor these positions and race to liquidate you the moment your health drops, extracting value through gas wars and front-running.

Umbra Protocol fixes this at the protocol level using iExec Nox.

---

## Architecture
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
│                                                              │
│   React + ethers.js v6 + Tailwind CSS                       │
│   @iexec-nox/handle JS SDK (encrypt inputs, decrypt debt)   │
│                                                              │
│   Landing / Dashboard / Markets / Liquidation Board         │
└──────────────────────────┬──────────────────────────────────┘
│  wallet connection + contract calls
▼
┌─────────────────────────────────────────────────────────────┐
│                  ARBITRUM SEPOLIA TESTNET                    │
│                                                              │
│  UmbraOracle          UmbraVault          UmbraLiquidator   │
│  ─────────────        ──────────          ───────────────   │
│  Chainlink feeds      depositCollateral   startAuction()    │
│  ETH/USD              borrow()            submitBid()       │
│  USDC/USD             repay()             settleAuction()   │
│  getHealthFactor()    withdraw()          sealed bids       │
│                       flagForLiquidation()                   │
│                              │                              │
│                              │ mintDebt / burnDebt          │
│                              ▼                              │
│                    UmbraDebtToken                           │
│                    ──────────────────────────               │
│                    ERC-7984 via iExec Nox                   │
│                    euint256 encrypted debt handles          │
│                    Nox.toEuint256() / Nox.add()             │
│                    Nox.allow() — ACL per user               │
│                    Only holder can decrypt via SDK          │
└──────────────────────────▲──────────────────────────────────┘
│  polls every 2 min
┌─────────────────────────────────────────────────────────────┐
│              BACKEND HEALTH MONITOR (Railway)                │
│   Node.js — scans events, checks health, flags positions    │
│   Calls vault.flagForLiquidation() when HF drops below 100  │
└─────────────────────────────────────────────────────────────┘

---

## Confidentiality Model

| What | Standard DeFi | Umbra Protocol |
|---|---|---|
| Debt balance | Public `uint256` | Encrypted `euint256` via iExec Nox TEE |
| Decryption | Anyone can read | Only position holder (EIP-712 signature) |
| Collateral | Public | Public (encrypted division not yet in Nox v0.1.0) |
| Liquidation | Public MEV race | Sealed-bid TEE auction |

**How decryption works:** When you click "Decrypt My Balance" on the Dashboard, the Nox JS SDK creates a temporary RSA keypair in your browser, your wallet signs a gasless EIP-712 message, the Nox KMS verifies you are the authorized ACL holder, and your debt amount is decrypted locally — never transmitted in plaintext.

---

## Deployed Contracts — Arbitrum Sepolia

| Contract | Address | Explorer |
|---|---|---|
| UmbraOracle | `0xFeaa884074d1a4C67eC36b5668479AFa5aaE8331` | [View](https://sepolia.arbiscan.io/address/0xFeaa884074d1a4C67eC36b5668479AFa5aaE8331) |
| UmbraVault | `0xd6DAFf297e0A3B93086aF4753748A1024340Ee60` | [View](https://sepolia.arbiscan.io/address/0xd6DAFf297e0A3B93086aF4753748A1024340Ee60) |
| UmbraLiquidator | `0xb7ead1f217A1a4c744fe2A1E295Ee66234b0D7c6` | [View](https://sepolia.arbiscan.io/address/0xb7ead1f217A1a4c744fe2A1E295Ee66234b0D7c6) |
| UmbraDebtToken (ERC-7984) | `0x977853D89aE7CA54476AA450F2e366Ee5DBfEbcd` | [View](https://sepolia.arbiscan.io/address/0x977853D89aE7CA54476AA450F2e366Ee5DBfEbcd) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Arbitrum Sepolia (chainId 421614) |
| Confidential Storage | iExec Nox — `euint256` encrypted types |
| Confidential Token | ERC-7984 via `@iexec-nox/nox-protocol-contracts` |
| JS Encryption SDK | `@iexec-nox/handle` — `encryptInput` + `decrypt` |
| Smart Contracts | Solidity 0.8.28 + OpenZeppelin v5 |
| Contract Tooling | Hardhat v3 |
| Contract Generation | ChainGPT Smart Contract Generator |
| Contract Audit | ChainGPT Smart Contract Auditor |
| Price Oracle | Chainlink (ETH/USD + USDC/USD on Arbitrum Sepolia) |
| Frontend | React + Vite + Tailwind CSS v3 |
| Wallet | ethers.js v6 + MetaMask |
| Backend Monitor | Node.js deployed on Railway |
| Frontend Hosting | Netlify |

---

## Project Structure
umbra-protocol/
├── contracts/
│   ├── UmbraOracle.sol        Chainlink price feed wrapper (staleness check)
│   ├── UmbraVault.sol         Core lending vault — integrates UmbraDebtToken
│   ├── UmbraLiquidator.sol    Sealed-bid liquidation auction contract
│   └── UmbraDebtToken.sol     iExec Nox ERC-7984 confidential debt token
│                              Uses euint256, Nox.toEuint256(), Nox.add(),
│                              Nox.sub(), Nox.allowThis(), Nox.allow()
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          Landing page with particle animation
│   │   │   ├── Dashboard.jsx        Position management + Nox decrypt UI
│   │   │   ├── Markets.jsx          Protocol terminal — live Chainlink prices
│   │   │   └── LiquidationBoard.jsx Live auction board with countdown timers
│   │   ├── components/
│   │   │   ├── Navbar.jsx           Responsive with mobile hamburger
│   │   │   └── Footer.jsx           Shared footer
│   │   ├── context/
│   │   │   └── WalletContext.jsx    MetaMask + auto Arbitrum Sepolia switch
│   │   └── lib/
│   │       ├── contracts.js         ABIs + deployed addresses
│   │       └── txHelpers.js         Gas buffer + human error messages
│   └── public/favicon.svg
├── backend/
│   └── src/monitor.js         TEE health monitor (Railway, always-on)
├── scripts/
│   ├── deploy.js              Deploys + wires all 4 contracts
│   └── fundReserve.js         Seeds USDC lending reserve
├── audit-report.md            ChainGPT security audit — 0 critical findings
└── feedback.md                iExec developer experience notes

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
```

### Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
PRIVATE_KEY=your_deployer_private_key
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ORACLE_ADDRESS=0xFeaa884074d1a4C67eC36b5668479AFa5aaE8331
VAULT_ADDRESS=0xd6DAFf297e0A3B93086aF4753748A1024340Ee60
LIQUIDATOR_ADDRESS=0xb7ead1f217A1a4c744fe2A1E295Ee66234b0D7c6
DEBT_TOKEN_ADDRESS=0x977853D89aE7CA54476AA450F2e366Ee5DBfEbcd

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### Run the backend monitor

```bash
node backend/src/monitor.js
```

### Redeploy contracts (optional)

```bash
npx hardhat compile
node scripts/deploy.js
```

---

## How the iExec Nox Integration Works

### On Borrow
User calls vault.borrow(amount)
│
▼
Vault checks health factor via Chainlink oracle
│
▼
Vault transfers USDC to user
│
▼
Vault calls debtToken.mintDebt(user, amount)
│
▼
UmbraDebtToken calls Nox.toEuint256(amount)
│  routes through iExec TEE
▼
euint256 handle stored on-chain (32 bytes, encrypted)
Nox.allow(handle, user) — only user can decrypt

### On Decrypt (Dashboard)
User clicks "Decrypt My Balance"
│
▼
@iexec-nox/handle SDK creates ephemeral RSA keypair
│
▼
MetaMask signs EIP-712 message (gasless, no ETH cost)
│
▼
Nox KMS verifies signature + checks on-chain ACL
│
▼
Encrypted data wrapped with user's RSA public key
│
▼
SDK decrypts locally in browser — plaintext never transmitted
│
▼
Debt amount displayed only on user's screen

---

## How Liquidations Work
Position health factor drops below 100
│
▼
Backend monitor detects it via Chainlink oracle
│
▼
vault.flagForLiquidation(user) called on-chain
vault triggers liquidator.startAuction(user)
│
▼
1-hour sealed-bid auction opens
Liquidators submit encrypted bids — nobody sees others' amounts
│
▼
After 1 hour, anyone calls settleAuction(borrower)
Highest bid wins — emits AuctionSettled event
│
▼
Liquidation Board updates in real time

---

## Security

- OpenZeppelin `ReentrancyGuard` on all state-changing functions
- Chainlink staleness check — 48-hour window for testnet feed reliability
- `setVault()` and `setDebtToken()` — one-time initialization, permanently locked after deployment
- `fallback()` reverts to prevent silent ETH acceptance
- `onlyPositionHolder` modifier — position data readable only by holder or owner
- Nox ACL — encrypted debt handle accessible only by the borrower's wallet
- Full ChainGPT audit — see [audit-report.md](./audit-report.md) — zero critical findings

---

## Links

- **Live App:** https://umbra-protocol.netlify.app
- **iExec Nox Docs:** https://docs.iex.ec/nox-protocol
- **ChainGPT:** https://app.chaingpt.org
- **Audit Report:** [audit-report.md](./audit-report.md)
- **iExec Vibe Coding Challenge:** https://discord.gg/RXYHBJceMe

---

*A Lax Lab product — iExec Vibe Coding Challenge 2026*
