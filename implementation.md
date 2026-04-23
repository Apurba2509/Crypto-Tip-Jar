# 🫙 Crypto Tip Jar — Complete Implementation Guide

> A decentralized tip jar dApp on **Stellar Soroban** Testnet. Users connect their
> Freighter wallet and send XLM tips stored permanently on-chain. A live feed shows
> recent tippers in real time.

---

## 1. Project Overview

**Crypto Tip Jar** is a Web3 dApp built on Stellar Soroban smart contracts.
Anyone with a Freighter wallet can send XLM tips that are permanently recorded on
Stellar Testnet — no database, no backend, no middleman.

### Key Features
- 🔗 Freighter Wallet Integration — one-click connect + browser-extension signing
- ✦ Send XLM Tips — pre-set amounts (0.5 / 1 / 2 / 5 / 10 XLM) or custom
- 📜 On-Chain Tip History — every tip stored in contract persistent storage
- 🔴 Live Feed — auto-refreshes every 30 s, showing truncated address + XLM amount
- 📊 Stats — total XLM tipped and unique tipper count
- 🧭 Stellar Explorer Links — every tx hash links to stellar.expert

### Target Users
Hackathon developers, creators who want on-chain tips, Web3 learners exploring Soroban.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Blockchain | Stellar Soroban (Testnet) |
| Wallet | @stellar/freighter-api v2 |
| Contract SDK | @stellar/stellar-sdk v12 |
| Smart Contract | Rust — soroban-sdk 20.0.0 |
| Notifications | react-hot-toast |
| Icons | lucide-react |

---

## 3. Folder Structure

```
crypto-tip-jar/
├── contract/
│   ├── src/lib.rs          ← Soroban smart contract
│   └── Cargo.toml
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.jsx
│   │   │   ├── TipForm.jsx
│   │   │   └── TipFeed.jsx
│   │   ├── utils/contract.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
└── implementation.md
```

---

## 4. Deployment Guide

### Step 1 — Install Rust toolchain + Soroban CLI

```bash
# Add wasm target
rustup target add wasm32-unknown-unknown

# Install soroban CLI
cargo install --locked soroban-cli
```

**Windows:** Use Git Bash or WSL2.

### Step 2 — Configure Soroban CLI for Testnet

```bash
soroban network add \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  testnet

soroban keys generate --global deployer --network testnet
soroban keys fund deployer --network testnet
```

### Step 3 — Build the Contract

```bash
cd contract
soroban contract build
# Wasm output: target/wasm32-unknown-unknown/release/tip_jar.wasm
```

### Step 4 — Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/tip_jar.wasm \
  --source deployer \
  --network testnet
```

Copy the printed Contract ID (starts with `C`).

### Step 5 — Paste Contract ID into Frontend

Edit `frontend/src/utils/contract.js`:
```js
// Before:
export const CONTRACT_ID = "YOUR_CONTRACT_ID_HERE";
// After:
export const CONTRACT_ID = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
```

### Step 6 — Install Frontend & Run

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Step 7 — Set Up Freighter

1. Install from https://freighter.app/
2. Switch network to **Testnet**
3. Fund with test XLM (Step 8)

### Step 8 — Get Free Test XLM (Friendbot)

```bash
curl "https://friendbot.stellar.org/?addr=GYOUR_G_ADDRESS"
```

Or visit: https://friendbot.stellar.org

---

## 5. Wallet Integration Cheat Sheet

```js
import { isConnected, getPublicKey, signTransaction } from "@stellar/freighter-api";

// Check if Freighter extension is installed
const { isConnected: installed } = await isConnected();

// Get user's public key (prompts for permission first time)
const publicKey = await getPublicKey();

// Sign a transaction XDR string
const { signedTxXdr } = await signTransaction(xdrString, {
  networkPassphrase: "Test SDF Network ; September 2015",
});
```

---

## 6. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Buffer is not defined` | stellar-sdk needs Node polyfills | `vite-plugin-node-polyfills` handles this — run `npm install` |
| `account not found` | Address has no testnet balance | Fund via Friendbot |
| `User declined` | Rejected in Freighter popup | Try again, click Approve |
| CORS error | Custom RPC without CORS | Use `https://soroban-testnet.stellar.org` only |
| Tips not showing | CONTRACT_ID wrong or not deployed | Verify the ID in contract.js |
| Freighter not detected | Extension not installed | Install from freighter.app, refresh page |

---

## 7. Testnet Resources

| Resource | URL |
|---|---|
| Soroban RPC | https://soroban-testnet.stellar.org |
| Friendbot | https://friendbot.stellar.org |
| Testnet Explorer | https://stellar.expert/explorer/testnet |
| Freighter | https://freighter.app |
| Soroban Docs | https://soroban.stellar.org |

---

## 8. Production Checklist

- [ ] Deploy contract to Mainnet; update `Networks.PUBLIC` + mainnet RPC
- [ ] Add pagination / max-tips limit in `get_tips` to prevent heavy reads
- [ ] Store ledger sequence in `TipEntry` for real timestamps
- [ ] Add storage rent extension calls (`extend_ttl`) for long-lived persistent data
- [ ] Gate `clear_tips` behind an admin `Address` check

---

*Good luck at the hackathon! 🚀*
