# iExec Developer Experience — Feedback

**Project:** Umbra Protocol  
**Challenge:** iExec Vibe Coding Challenge 2026  
**Date:** April 2026

---

## Overview

This feedback covers my experience building a confidential DeFi lending protocol using the iExec Nox protocol and ERC-7984 confidential tokens over approximately 10 days as a first-time iExec builder.

---

## What Worked Well

### The core concept is compelling
The idea of confidential tokens as a DeFi primitive is genuinely useful. In traditional lending protocols, every position is fully transparent — this enables MEV, front-running, and targeted liquidation attacks. ERC-7984 addresses a real problem with a technically sound approach.

### iExec's faucet (cdefi.iex.ec)
The demo faucet at https://cdefi.iex.ec was easy to use and provided tokens quickly without requiring a mainnet balance. This was a significant quality-of-life improvement over other testnet faucets that require mainnet ETH as a spam-prevention mechanism. For hackathon builders with no mainnet assets, this removed a real blocker.

### Documentation structure
The Nox documentation at docs.iex.ec provided a clear conceptual explanation of how TEE computation integrates with on-chain contracts. The getting-started section gave enough context to understand the architecture before diving into the code.

### Open npm packages
The availability of iExec Nox packages on npm (https://www.npmjs.com/org/iexec-nox) meant integration could be done through standard Node.js tooling without proprietary SDKs or custom build steps.

---

## Challenges Encountered

### ERC-7984 is very new
The Nox protocol v0.1.0 was released on April 9, 2026 — the same week as the hackathon kickoff. This meant there were no community examples, no Stack Overflow answers, and no third-party tutorials. Every integration decision required reading the raw specification and making educated guesses. For a standard like ERC-7984 to gain adoption, it needs more worked examples in the documentation.

### ChainGPT's Smart Contract Generator did not know Nox
ChainGPT's LLM was trained before Nox's release. When asked to generate contracts using ERC-7984 confidential token syntax, it produced standard ERC-20 code. This is expected for such a new standard, but worth noting for the ChainGPT team — a Nox-specific fine-tune or prompt template would be a significant improvement for the next hackathon.

The workflow that worked: use ChainGPT to generate standard Solidity patterns (vault, oracle, liquidator), then manually integrate the Nox-specific layer on top. ChainGPT's auditor was independently useful regardless of generation.

### Circular deployment dependency
Deploying UmbraVault and UmbraLiquidator requires each contract's address to be passed to the other's constructor. This circular dependency is a common smart contract pattern but required a `setVault()` post-deployment initialization step. A note in the Nox documentation about patterns for composable confidential contract deployment would help new builders avoid this.

### Testnet RPC instability
The public Arbitrum Sepolia RPC (`https://sepolia-rollup.arbitrum.io/rpc`) occasionally returned stale fee data, causing transactions to fail with "max fee per gas less than block base fee". This required implementing a 30% gas buffer on all transaction submissions in the frontend. This is an Arbitrum testnet infrastructure issue rather than an iExec issue specifically, but it affected development velocity.

---

## Suggestions for iExec

1. **Worked examples repository** — A GitHub repo with 2-3 complete Nox + ERC-7984 integration examples (lending, voting, payments) would dramatically reduce the learning curve for new builders.

2. **ChainGPT + Nox integration** — Partner with ChainGPT to fine-tune their generator with Nox-specific patterns. Even a prompt template pinned in Discord would help.

3. **TEE health monitor template** — A reference implementation of a backend health monitor service (similar to what Umbra Protocol built) would be a valuable open-source contribution from iExec.

4. **Wizard improvements** — The confidential DeFi wizard at https://cdefi-wizard.iex.ec is a good starting point. Adding export-to-Hardhat functionality and a one-click testnet deploy would make it production-ready for hackathons.

---

## Overall Assessment

Building on iExec Nox for a first-time project in 10 days was challenging primarily because of the newness of the standard rather than any technical weakness in the protocol itself. The core primitives are sound, the TEE model is well-designed, and the DeFi use cases are genuinely novel.

The biggest unlock for iExec's developer ecosystem will be documentation depth and worked examples. The foundation is solid — the tooling around it needs to grow.

**Would I build on iExec Nox again?** Yes. The confidentiality primitive it offers is not available elsewhere in the same composable form. Once the ecosystem matures with more examples and tooling, it will be a strong choice for any DeFi protocol that wants to protect user positions from MEV and information asymmetry.
