// deploy.cjs — Deploy TipJar contract
// Uses stellar-sdk v13 (protocol 22 compatible) + raw fetch for tx polling
// Run: node deploy.cjs "your seed phrase words here"

const { readFileSync } = require("fs");
const { createHash }   = require("crypto");
const { resolve }      = require("path");
const bip39            = require("bip39");
const { derivePath }   = require("ed25519-hd-key");

// stellar-sdk v13: rpc (lowercase), not SorobanRpc
const { Keypair, rpc, TransactionBuilder, Networks, Address, Operation } = require("@stellar/stellar-sdk");

const input = process.argv.slice(2).join(" ").trim();
if (!input) {
  console.error('❌ Usage: node deploy.cjs "your seed phrase"');
  process.exit(1);
}

const NETWORK = Networks.TESTNET;
const RPC     = "https://soroban-testnet.stellar.org";
const WASM    = resolve(__dirname, "../contract/target/wasm32v1-none/release/tip_jar.wasm");

async function getKeypair() {
  if (input.startsWith("S") && !input.includes(" ")) return Keypair.fromSecret(input);
  console.log("🔑 Deriving keypair from seed phrase...");
  const seed    = await bip39.mnemonicToSeed(input);
  const { key } = derivePath("m/44'/148'/0'", seed.toString("hex"));
  return Keypair.fromRawEd25519Seed(key);
}

// Raw HTTP poll — bypasses any XDR parsing on the tx result
async function waitForTx(txHash) {
  process.stdout.write("   Waiting");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write(".");
    const res    = await fetch(RPC, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: { hash: txHash } }),
    });
    const data   = await res.json();
    const status = data?.result?.status;
    if (status === "SUCCESS") { console.log(" ✅"); return data.result; }
    if (status === "FAILED")  { throw new Error("Transaction failed on-chain"); }
  }
  throw new Error("Timed out after 60s");
}

async function main() {
  const keypair = await getKeypair();
  const server  = new rpc.Server(RPC);
  console.log("\n📋 Deployer:", keypair.publicKey());

  const wasm     = readFileSync(WASM);
  const wasmHash = createHash("sha256").update(wasm).digest();
  console.log("📦 WASM size:", wasm.length, "bytes");

  // ── Step 1: Upload WASM ───────────────────────────────────────────────
  console.log("\n⬆️  Step 1: Uploading WASM...");
  let account = await server.getAccount(keypair.publicKey());

  const uploadTx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: NETWORK })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(60).build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(uploadSim))
    throw new Error("Upload simulation failed: " + uploadSim.error);

  const uploadReady = rpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadReady.sign(keypair);
  const uploadSend = await server.sendTransaction(uploadReady);
  if (uploadSend.status === "ERROR") throw new Error("Upload send failed");

  await waitForTx(uploadSend.hash);

  // ── Step 2: Deploy Contract ───────────────────────────────────────────
  console.log("\n🚀 Step 2: Deploying contract...");
  account = await server.getAccount(keypair.publicKey());

  const deployTx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: NETWORK })
    .addOperation(Operation.createCustomContract({ address: new Address(keypair.publicKey()), wasmHash }))
    .setTimeout(60).build();

  const deploySim = await server.simulateTransaction(deployTx);
  if (rpc.Api.isSimulationError(deploySim))
    throw new Error("Deploy simulation failed: " + deploySim.error);

  // Get contract ID from simulation retval (before sending the tx)
  let contractId = null;
  try { contractId = Address.fromScVal(deploySim.result.retval).toString(); } catch (_) {}

  const deployReady = rpc.assembleTransaction(deployTx, deploySim).build();
  deployReady.sign(keypair);
  const deploySend = await server.sendTransaction(deployReady);
  if (deploySend.status === "ERROR") throw new Error("Deploy send failed");

  await waitForTx(deploySend.hash);

  // ── Done ─────────────────────────────────────────────────────────────
  console.log("\n🎉🎉🎉 CONTRACT DEPLOYED! 🎉🎉🎉\n");
  if (contractId) {
    console.log("📋 Contract ID:\n\n   " + contractId);
    console.log('\n👉 Open frontend/src/utils/contract.js line 23 and set:');
    console.log('   export const CONTRACT_ID = "' + contractId + '";\n');
  } else {
    console.log("👉 Find Contract ID at Stellar Explorer:");
    console.log("   https://stellar.expert/explorer/testnet/account/" + keypair.publicKey());
    console.log("   Click the latest 'create contract' transaction\n");
  }
}

main().catch((e) => { console.error("\n❌ Error:", e.message); process.exit(1); });
