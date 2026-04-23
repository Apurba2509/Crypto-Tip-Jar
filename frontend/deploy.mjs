// deploy.mjs — Deploy TipJar contract using Node.js (bypasses Windows SSL issue)
// Compatible with stellar-sdk v15 + Stellar protocol 22
//
// Usage: node deploy.mjs "your seed phrase words here"
//    Or: node deploy.mjs SYOURSECRETKEY

import { readFileSync } from "fs";
import { createHash as nodeHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// stellar-sdk v15 is CommonJS — must use default import
import sdk from "@stellar/stellar-sdk";
const { Keypair, SorobanRpc, TransactionBuilder, Networks, Address, Operation, xdr } = sdk;

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Join all args (handles seed phrase passed without quotes) ───────────────
const input = process.argv.slice(2).join(" ").trim();
if (!input) {
  console.error('❌ Usage: node deploy.mjs "your seed phrase here"');
  process.exit(1);
}

// ── Derive keypair from secret key OR seed phrase ───────────────────────────
async function getKeypair(input) {
  if (input.startsWith("S") && !input.includes(" ")) {
    return Keypair.fromSecret(input);
  }
  console.log("🔑 Deriving keypair from seed phrase...");
  const bip39 = require("bip39");
  const { derivePath } = require("ed25519-hd-key");
  const seed = await bip39.mnemonicToSeed(input);
  const { key } = derivePath("m/44'/148'/0'", seed.toString("hex"));
  return Keypair.fromRawEd25519Seed(key);
}

// ── Poll until tx confirmed ─────────────────────────────────────────────────
async function waitForTx(server, hash) {
  process.stdout.write("   Waiting");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write(".");
    try {
      const tx = await server.getTransaction(hash);
      if (tx.status === "SUCCESS") { console.log(" ✅"); return tx; }
      if (tx.status === "FAILED")  { throw new Error("Transaction failed on-chain"); }
    } catch (e) {
      if (e.message.includes("Transaction failed")) throw e;
      // Ignore parse errors on intermediate polls — just keep waiting
    }
  }
  throw new Error("Timed out after 60s");
}

const NETWORK = Networks.TESTNET;
const RPC    = "https://soroban-testnet.stellar.org";
const WASM   = resolve(__dirname, "../contract/target/wasm32v1-none/release/tip_jar.wasm");

async function main() {
  const keypair = await getKeypair(input);
  const server  = new SorobanRpc.Server(RPC);

  console.log("\n📋 Deployer:", keypair.publicKey());
  console.log("📦 Loading WASM...");
  const wasm     = readFileSync(WASM);
  // Compute SHA-256 of the WASM locally — this IS the wasm hash Soroban uses
  const wasmHash = nodeHash("sha256").update(wasm).digest();
  console.log("   Size:", wasm.length, "bytes");
  console.log("   Hash:", wasmHash.toString("hex"));

  // ── Step 1: Upload WASM ────────────────────────────────────────────────
  console.log("\n⬆️  Step 1: Uploading WASM...");
  let account = await server.getAccount(keypair.publicKey());

  const uploadTx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: NETWORK })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (SorobanRpc.Api.isSimulationError(uploadSim))
    throw new Error("Upload simulation failed: " + uploadSim.error);

  const uploadFinal = SorobanRpc.assembleTransaction(uploadTx, uploadSim).build();
  uploadFinal.sign(keypair);
  const uploadSend = await server.sendTransaction(uploadFinal);
  if (uploadSend.status === "ERROR")
    throw new Error("Upload error: " + JSON.stringify(uploadSend.errorResult));

  await waitForTx(server, uploadSend.hash);
  // We use the locally-computed wasmHash — no need to parse RPC return value

  // ── Step 2: Deploy contract ────────────────────────────────────────────
  console.log("\n🚀 Step 2: Creating contract instance...");
  account = await server.getAccount(keypair.publicKey());

  const deployTx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: NETWORK })
    .addOperation(Operation.createCustomContract({
      address: new Address(keypair.publicKey()),
      wasmHash,
    }))
    .setTimeout(60)
    .build();

  const deploySim = await server.simulateTransaction(deployTx);
  if (SorobanRpc.Api.isSimulationError(deploySim))
    throw new Error("Deploy simulation failed: " + deploySim.error);

  const deployFinal = SorobanRpc.assembleTransaction(deployTx, deploySim).build();
  deployFinal.sign(keypair);
  const deploySend = await server.sendTransaction(deployFinal);
  if (deploySend.status === "ERROR")
    throw new Error("Deploy error: " + JSON.stringify(deploySend.errorResult));

  const deployDone = await waitForTx(server, deploySend.hash);

  // Extract contract ID from the result
  let contractId;
  try {
    contractId = Address.fromScVal(deployDone.returnValue).toString();
  } catch {
    // Fallback: extract from result XDR manually
    try {
      const result = xdr.TransactionResult.fromXDR(deployDone.resultXdr, "base64");
      const opResult = result.result().results()[0].tr().invokeHostFunctionResult().success();
      contractId = Address.fromScVal(opResult).toString();
    } catch {
      contractId = "CHECK STELLAR EXPLORER — tx hash: " + deploySend.hash;
    }
  }

  console.log("\n");
  console.log("🎉🎉🎉 CONTRACT DEPLOYED SUCCESSFULLY! 🎉🎉🎉");
  console.log("\n📋 Your Contract ID:\n");
  console.log("   " + contractId);
  console.log('\n👉 Paste into frontend/src/utils/contract.js line 23:');
  console.log('   export const CONTRACT_ID = "' + contractId + '";\n');
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
