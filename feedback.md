# iExec Developer Experience — Feedback

**Project:** Umbra Protocol
**Builder:** Lax Lab
**Challenge:** iExec Vibe Coding Challenge 2026
**Date:** April 2026

---

I want to write this feedback honestly, because I think that is more useful to the iExec team than a polished PR piece.

I came into this hackathon with zero coding experience. I used Claude as my AI coding partner and built every part of this project over about two weeks. What I experienced with iExec Nox was genuinely interesting — but it was also one of the most technically frustrating experiences I have had as a builder. Here is what actually happened.

---

## What Worked

**The Nox JS SDK decrypt flow is exceptional.**

The moment that stood out most in this entire project was when I clicked "Decrypt My Balance" on the dashboard and my debt amount appeared after signing a gasless EIP-712 message. That interaction — where the plaintext never leaves your browser, where no server ever sees your data, where the cryptographic proof is verified on-chain — is genuinely new and genuinely powerful. I have never seen anything like it in DeFi. When that moment works, it makes the whole project feel real.

**The npm packages installed cleanly.**

`@iexec-nox/nox-protocol-contracts`, `@iexec-nox/nox-confidential-contracts`, and `@iexec-nox/handle` all installed without dependency conflicts on Node.js v24 with Hardhat v3. That sounds basic but it is not — I have seen hackathon projects collapse because a library would not install. The packaging is solid.

**The NoxCompute contract is live on Arbitrum Sepolia.**

When I checked the `noxComputeContract()` function, it returned `0xd464B198f06756a1d00be223634b85E0a731c229` for chainId 421614. The infrastructure is actually deployed and working. The TEE validation happens on real on-chain calls, not mocks. That gives me confidence that what I built is real.

**The faucet at cdefi.iex.ec was the best faucet I have ever used.**

No mainnet ETH requirement. No social login. No waiting. I got tokens immediately and could focus on building instead of fighting infrastructure. Every hackathon should have this.

---

## What Was Hard

**The Hardhat documentation page says "Coming Soon."**

When I tried to set up Hardhat v3 with the Nox contracts, I went to the documentation page for Hardhat integration and found a placeholder. There is no guide. I had to reverse-engineer the import paths from the npm package structure by reading the source files directly. This cost me about a day and a half.

I am not complaining — I figured it out. But for a builder with less persistence, this would have been the point where they gave up. The Nox contracts compile and work perfectly with Hardhat v3, but nobody would know that from reading the docs.

**`Nox.fromExternal()` with cross-contract proof forwarding does not work the way the spec implies.**

This was the hardest technical problem I faced. The `encryptInput()` function from the JS SDK creates a proof tied to a specific `msg.sender` context. When you forward that proof through multiple contracts — in my case, Vault calls DebtToken which calls `Nox.fromExternal()` — the validation fails because `msg.sender` has changed.

I spent three days on this. I tried every variation: passing the vault address as the authorized contract, passing the debtToken address, casting between `bytes32` and `externalEuint256`. Every attempt reverted on-chain with no useful error message.

In the end, I used `Nox.toEuint256()` instead of `fromExternal()`, which works reliably but does not go through the Handle Gateway proof verification. The encrypted storage and decrypt flow both still work correctly — the debt is genuinely encrypted as a `euint256` and only decryptable by the holder. But the input is not validated by the Handle Gateway proof before entering the TEE, which is a meaningful difference.

If there is a correct pattern for cross-contract proof forwarding in Nox, I could not find it anywhere in the documentation.

**The Chainlink USDC/USD feed on Arbitrum Sepolia goes 21 hours stale.**

USDC is always approximately $1.00, so Chainlink rarely updates the testnet feed. My oracle had a 1-hour staleness check, which caused every borrow to revert. I only discovered this after days of debugging gas issues, proof issues, and everything else. The fix was trivial — extend the window to 48 hours — but it cost significant time because the error message was generic.

A note in the Nox getting-started guide saying "Chainlink testnet feeds may be stale — use a longer staleness window in development" would have saved a lot of frustration.

**ChainGPT does not know iExec Nox.**

This is expected — Nox v0.1.0 launched during the hackathon. But since ChainGPT is a named partner, I want to flag it. When I asked ChainGPT to generate ERC-7984 contracts, it produced standard ERC-20 code. I ended up using ChainGPT for the base DeFi patterns and writing the Nox layer myself. ChainGPT's auditor was independently useful and found real issues — I kept that integration. But the generator cannot help with Nox-specific code yet.

---

## What I Would Do With More Time

The thing I wanted most and could not achieve is `encryptInput()` working correctly through the contract call chain. If that worked, the borrow amount would never appear in calldata in plaintext form — it would be encrypted client-side before the transaction is even signed. That is the full vision and it is architecturally correct. I just could not get the proof validation to survive cross-contract forwarding.

I would also love to encrypt the collateral amount. That requires encrypted comparison for health factor computation, which needs encrypted division — not currently in Nox v0.1.0. When that primitive lands, confidential lending becomes truly complete.

---

## Overall

I would build on iExec Nox again. The core primitive — on-chain encrypted storage with wallet-authorized decryption — is something I cannot get anywhere else. The ERC7984 base contract is well-designed. The JS SDK decrypt flow is genuinely impressive UX.

What the ecosystem needs most right now is worked examples. Not hello world. Real patterns — confidential lending, confidential governance, cross-contract proof forwarding. The primitives are there. Builders just need to see them assembled correctly once.

Thank you to the iExec team for the faucet, the packages, and the TEE infrastructure. This was a hard build but I am proud of what came out of it.