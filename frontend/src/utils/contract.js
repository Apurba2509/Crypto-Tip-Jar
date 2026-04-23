// contract.js — All Stellar / Soroban interaction logic lives here.
// This file is the single source of truth for reading and writing to the
// on-chain TipJar contract. Keep all raw stellar-sdk calls here so
// components stay clean and React-focused.

import {
  rpc,
  TransactionBuilder,
  Contract,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  Account,
  xdr,
} from "@stellar/stellar-sdk";

import { signTransaction, requestAccess, getPublicKey, isConnected } from "@stellar/freighter-api";

// ─── Configuration ─────────────────────────────────────────────────────────
// After deploying the contract, paste the returned contract ID here.
// Example: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export const CONTRACT_ID = "CA4LI5SUZLIXESGSHGXIGJXZZDAPJB32GZRDZASQL3EL3ZQGLNCKHF2B";

// Stellar Testnet network passphrase — must match what Freighter uses
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Soroban RPC endpoint for Testnet
export const SERVER_URL = "https://soroban-testnet.stellar.org";

// Conversion constant: 1 XLM = 10,000,000 stroops
const STROOPS_PER_XLM = 10_000_000;

// ─── RPC Server Singleton ──────────────────────────────────────────────────
// Re-use a single server instance across calls (avoids repeated connections)
const server = new rpc.Server(SERVER_URL, { allowHttp: false });

// ─── Helper: Truncate address for display ─────────────────────────────────
// Returns "GABC...WXYZ" format for UI display
export function truncateAddress(address) {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── 1. getTips — Read tip history from the contract ──────────────────────
/**
 * Calls the `get_tips` view function on the TipJar contract.
 * Because this is a read-only call we use `simulateTransaction` and
 * parse the result — no signature or fee required.
 *
 * @returns {Promise<Array<{address: string, amount: number}>>}
 *   Array of tip objects, newest entries last.
 *   `amount` is already converted from stroops → XLM (floating point).
 */
export async function getTips() {
  // If no contract has been deployed yet, return empty array
  if (CONTRACT_ID === "YOUR_CONTRACT_ID_HERE") {
    console.warn("CONTRACT_ID not set — returning empty tip list");
    return [];
  }

  try {
    // Build a contract handle pointing at our deployed contract
    const contract = new Contract(CONTRACT_ID);

    // We need a source account to build the transaction, but for view calls
    // we can use any valid address. We use a well-known testnet faucet address.
    const sourcePublicKey = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

    // For read-only simulations we don't need a real account from the network.
    // We create a dummy Account with sequence 0 — Soroban simulation ignores it.
    const sourceAccount = new Account(
      "GCQCN7V2Y5CHOGVC7P2L5W5BO4LHMNMVO7M555C2WYG2XJJEPUJ3HMFO",
      "0"
    );

    // Build the transaction that invokes `get_tips` with no arguments
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_tips")) // no args needed
      .setTimeout(30)
      .build();

    // Simulate the call — Soroban returns the result in the simulation response
    const result = await server.simulateTransaction(tx);

    // Check for simulation errors
    if (rpc.Api.isSimulationError(result)) {
      console.error("Simulation error:", result.error);
      return [];
    }

    // Parse the returned ScVal (Stellar Contract Value) into a native JS value
    // The contract returns Vec<TipEntry> which maps to an array of structs
    const rawValue = result.result?.retval;
    if (!rawValue) return [];

    const nativeResult = scValToNative(rawValue);

    // Map the raw result to a clean { address, amount } shape
    // Each entry is an object with `tipper` (Address) and `amount` (BigInt)
    const tips = nativeResult.map((entry) => ({
      address: entry.tipper?.toString() ?? entry.tipper,
      amount: Number(entry.amount) / STROOPS_PER_XLM, // convert stroops → XLM
    }));

    // Return in reverse order so newest tips appear first in the UI
    return tips.reverse();
  } catch (err) {
    console.error("getTips failed:", err);
    return [];
  }
}

// ─── 2. sendTip — Build, sign, and submit a tip transaction ───────────────
/**
 * Invokes the `tip(tipper, amount)` function on the TipJar contract.
 *
 * Flow:
 *  1. Load the sender's account from the network
 *  2. Build a Soroban transaction calling `tip`
 *  3. Simulate to get resource estimates (required by Soroban)
 *  4. Assemble the final transaction with simulation data
 *  5. Sign with Freighter wallet (user approves in extension popup)
 *  6. Submit to the network and poll until confirmed
 *
 * @param {string} senderAddress  — The public key of the tipper (from Freighter)
 * @param {number} amountXLM     — Tip amount in XLM (e.g. 1.5)
 * @returns {Promise<string>}     — The transaction hash on success
 * @throws {Error}                — On simulation failure, rejection, or timeout
 */
export async function sendTip(senderAddress, amountXLM) {
  if (!senderAddress) throw new Error("Wallet not connected");
  if (!amountXLM || amountXLM <= 0) throw new Error("Invalid tip amount");

  // Convert XLM to stroops (integer, as the contract expects i128)
  const amountStroops = Math.round(amountXLM * STROOPS_PER_XLM);

  // Build the contract call target
  const contract = new Contract(CONTRACT_ID);

  // Load the sender's account (need sequence number for transaction building)
  const senderAccount = await server.getAccount(senderAddress);

  // Convert JS values to Soroban ScVal format:
  //   - tipper: Address ScVal
  //   - amount: i128 ScVal
  const tipperScVal = new Address(senderAddress).toScVal();
  const amountScVal = nativeToScVal(amountStroops, { type: "i128" });

  // ── Step 1: Build the base transaction ────────────────────────────────
  const tx = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("tip", tipperScVal, amountScVal) // call tip(tipper, amount)
    )
    .setTimeout(60) // 60 second window — generous for wallet signing time
    .build();

  // ── Step 2: Simulate to get resource fees ─────────────────────────────
  // Soroban REQUIRES simulation before submission so the node can calculate
  // compute/memory/storage fees. The simulated result is attached to the tx.
  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // ── Step 3: Assemble the final transaction with resource data ──────────
  // `assembleTransaction` merges the simulation footprint + fees into the tx
  const assembledTx = rpc.assembleTransaction(
    tx,
    simResult
  ).build();

  // ── Step 4: Convert to XDR and sign with Freighter ────────────────────
  // `signTransaction` opens the Freighter popup and returns a signed XDR string.
  // Note: freighter-api v2 may return the XDR directly as a string, or as
  // { signedTxXdr, error } — we handle both shapes below.
  const xdrString = assembledTx.toXDR();

  const signResult = await signTransaction(xdrString, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Handle both freighter-api response shapes:
  // v1 style: { signedTxXdr: "...", error: null }
  // v2 style: "AAAA..." (plain XDR string)
  const signedTxXdr =
    typeof signResult === "string"
      ? signResult
      : signResult?.signedTxXdr;

  const signError =
    typeof signResult === "string" ? null : signResult?.error;

  if (signError) {
    throw new Error(`Freighter signing error: ${signError}`);
  }
  if (!signedTxXdr) {
    throw new Error("User rejected the transaction in Freighter");
  }

  // ── Step 5: Submit the signed transaction ──────────────────────────────
  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Submission error: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // ── Step 6: Poll until the transaction is confirmed ───────────────────
  // Soroban transactions are async — we need to poll for the final status
  const txHash = sendResult.hash;
  let attempts = 0;
  const MAX_ATTEMPTS = 30; // 30 × 2s = 60s timeout

  while (attempts < MAX_ATTEMPTS) {
    await new Promise((r) => setTimeout(r, 2000)); // wait 2 seconds
    const txStatus = await server.getTransaction(txHash);

    if (txStatus.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return txHash; // ✅ success — return the hash
    }

    if (txStatus.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on-chain. Hash: ${txHash}`);
    }

    // Status is PENDING — keep polling
    attempts++;
  }

  throw new Error(`Transaction timed out after 60s. Hash: ${txHash}`);
}

// ─── 3. Freighter Detection Utilities ─────────────────────────────────────

/**
 * Check if the Freighter browser extension is installed and accessible.
 * Returns false if the user hasn't installed Freighter yet.
 */
export async function isFreighterInstalled() {
  try {
    // isConnected() returns { isConnected: boolean } in freighter-api v2
    const result = await isConnected();
    return result?.isConnected ?? false;
  } catch {
    return false;
  }
}

/**
 * Connect to the Freighter wallet.
 *
 * Flow (matches what your friend sent):
 *  1. requestAccess() — triggers the Freighter popup asking the user to
 *     allow this site. This is REQUIRED before getPublicKey() will work.
 *  2. getPublicKey()  — returns the user's Stellar public key (G... address)
 *
 * @returns {Promise<string>} The Stellar public key (G... address)
 * @throws {Error} If Freighter is not installed or user rejects access
 */
export async function connectWallet() {
  // Step 1: Trigger the Freighter "Allow Access" popup.
  // Without this, getPublicKey() may silently return empty or throw.
  const accessResult = await requestAccess();

  // requestAccess returns an object with an `error` field on failure
  if (accessResult?.error) {
    throw new Error(`Freighter access denied: ${accessResult.error}`);
  }

  // Step 2: Now that the site is permitted, grab the public key.
  const publicKeyResult = await getPublicKey();

  // In freighter-api v2 this returns { publicKey, error }
  const publicKey = publicKeyResult?.publicKey ?? publicKeyResult;

  if (!publicKey) {
    throw new Error("Could not get public key from Freighter — is it unlocked?");
  }

  return publicKey;
}
