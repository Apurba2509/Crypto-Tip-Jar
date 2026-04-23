# 🫙 Crypto Tip Jar

## A decentralized tip jar built on Stellar Soroban

**Send XLM tips directly on-chain. No backend. No middlemen. Just code.**

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue?logo=stellar&logoColor=white)](https://soroban.stellar.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Rust](https://img.shields.io/badge/Rust-Smart_Contract-orange?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Network](https://img.shields.io/badge/Network-Testnet-yellow)](https://stellar.expert/explorer/testnet)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎯 What Is This?

**Crypto Tip Jar** is a Web3 dApp running on the Stellar blockchain. Anyone with a [Freighter wallet](https://freighter.app) can connect and send XLM tips that are **permanently stored on-chain** — no server, no database, no middleman.

Every tip is recorded in a Rust-based [Soroban](https://soroban.stellar.org) smart contract deployed to Stellar Testnet. The React frontend reads and writes to the contract directly using `@stellar/stellar-sdk`.

> **Built for a hackathon on Stellar Soroban Testnet** 🚀

---

## ✨ Features

| Feature | Details |
| --- | --- |
| 🔗 **Freighter Wallet** | One-click connect with browser extension signing |
| ✦ **Send XLM Tips** | Quick amounts (0.5 / 1 / 2 / 5 / 10 XLM) or custom |
| 📜 **On-Chain History** | Every tip stored permanently in Soroban persistent storage |
| 🔴 **Live Feed** | Auto-refreshes every 30s — see recent tippers in real time |
| 📊 **Stats** | Total XLM tipped + unique tipper count |
| 🧭 **Explorer Links** | Every tx hash links to stellar.expert |
| 🌑 **Premium Dark UI** | Glassmorphism design with gradient accents and animations |

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18 + Vite 5 |
| **Styling** | Tailwind CSS 3 |
| **Blockchain** | Stellar Soroban (Testnet) |
| **Wallet** | @stellar/freighter-api v2 |
| **SDK** | @stellar/stellar-sdk v13 |
| **Smart Contract** | Rust + soroban-sdk v22 |
| **UI Libraries** | react-hot-toast, lucide-react |

---

## 📁 Project Structure

```text
crypto-tip-jar/
├── contract/                    ← Rust smart contract
│   ├── src/lib.rs               ← Contract logic (tip + get_tips)
│   └── Cargo.toml               ← soroban-sdk v22
├── frontend/                    ← React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.jsx   ← Freighter connect button
│   │   │   ├── TipForm.jsx         ← Tip input + send button
│   │   │   └── TipFeed.jsx         ← Live tip history feed
│   │   ├── utils/
│   │   │   └── contract.js         ← All blockchain interactions
│   │   ├── App.jsx
│   │   └── index.css
│   ├── deploy.cjs               ← Node.js deploy script
│   ├── index.html
│   └── package.json
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
| --- | --- | --- |
| Rust | Latest stable | [rustup.rs](https://rustup.rs) |
| stellar-cli | v26 | [GitHub](https://github.com/stellar/stellar-cli) |
| Node.js | v18+ | [nodejs.org](https://nodejs.org) |
| Freighter | Latest | [freighter.app](https://freighter.app) |

---

### 1. Clone the repository

```bash
git clone https://github.com/Apurba2509/Crypto-Tip-Jar.git
cd Crypto-Tip-Jar
```

---

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

---

### 3. The contract is already deployed ✅

The smart contract is live on **Stellar Testnet**:

```text
Contract ID: CA4LI5SUZLIXESGSHGXIGJXZZDAPJB32GZRDZASQL3EL3ZQGLNCKHF2B
```

It's already configured in `frontend/src/utils/contract.js`. No deployment needed to run the app.

---

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Open **<http://localhost:5173>** in Chrome with the Freighter extension installed.

---

### 5. Use the app

1. Install [Freighter](https://freighter.app) Chrome extension
2. Switch Freighter to **Testnet** (Settings → Network → Test Network)
3. Get free test XLM: paste your address at [friendbot.stellar.org](https://friendbot.stellar.org)
4. Open <http://localhost:5173> → click **Connect Wallet**
5. Enter an amount and click **Send Tip** 🎉

---

## 📜 Smart Contract

**Location:** `contract/src/lib.rs`

The Soroban contract exposes two public functions:

| Function | Arguments | Returns | Description |
| --- | --- | --- | --- |
| `tip` | `tipper: Address`, `amount: i128` | `()` | Records a tip permanently on-chain |
| `get_tips` | — | `Vec<TipEntry>` | Returns full tip history |

Tips are stored in **persistent Soroban storage** under the key `"TIPS"`.
Amount is in **stroops** — 1 XLM = 10,000,000 stroops.

```rust
// TipEntry structure stored on-chain
pub struct TipEntry {
    pub tipper: Address,  // Stellar public key of the sender
    pub amount: i128,     // Amount in stroops
}
```

---

## 🔄 Redeploy the Contract (Optional)

If you want to deploy your own instance:

### Step 1 — Add WASM build target

```bash
rustup target add wasm32-unknown-unknown
```

### Step 2 — Build the contract

```bash
cd contract
stellar contract build
```

### Step 3 — Generate and fund a deployer key

```bash
stellar keys generate mykey --network testnet
# Fund it via browser: https://friendbot.stellar.org/?addr=<YOUR_KEY_ADDRESS>
```

### Step 4 — Deploy using the Node.js script

```bash
cd frontend
npm install
node deploy.cjs "your seed phrase here"
```

> The deploy script uses Node.js instead of `stellar-cli` to avoid Windows SSL certificate issues.

### Step 5 — Update the Contract ID

In `frontend/src/utils/contract.js` line 23:

```js
export const CONTRACT_ID = "YOUR_NEW_CONTRACT_ID_HERE";
```

---

## ⚠️ Important Notes

- This project uses **Stellar Testnet** — all XLM is **fake/free**
- Never use your real Stellar mainnet seed phrase or private keys
- The `deploy.cjs` script accepts seed phrases as CLI arguments — don't store them in files
- The deployed contract has no admin or upgrade mechanism (hackathon scope)

---

## 🐛 Common Issues

| Issue | Fix |
| --- | --- |
| Freighter not detected | Make sure extension is installed and on **Testnet** |
| `insufficient balance` | Get free XLM at [friendbot.stellar.org](https://friendbot.stellar.org) |
| Tips not showing | Check CONTRACT_ID in `contract.js` matches deployed contract |
| SSL error on `stellar` CLI | Use `node deploy.cjs` script instead |
| Transaction timeout | Testnet can be slow — wait 30s and try again |

---

## 🔗 Resources

| Resource | URL |
| --- | --- |
| Soroban Docs | [soroban.stellar.org](https://soroban.stellar.org) |
| Stellar SDK | [github.com/stellar/js-stellar-sdk](https://github.com/stellar/js-stellar-sdk) |
| Freighter Wallet | [freighter.app](https://freighter.app) |
| Testnet Explorer | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet) |
| Friendbot (free XLM) | [friendbot.stellar.org](https://friendbot.stellar.org) |
| Stellar Laboratory | [laboratory.stellar.org](https://laboratory.stellar.org) |

---

## 📄 License

MIT — feel free to fork and build on this!

---

## 🌐 Live Links

[View Contract on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CA4LI5SUZLIXESGSHGXIGJXZZDAPJB32GZRDZASQL3EL3ZQGLNCKHF2B)

**Made with ❤️ on Stellar Soroban Testnet**
