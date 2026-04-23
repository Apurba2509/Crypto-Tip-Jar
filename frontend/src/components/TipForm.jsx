// TipForm.jsx — The "send a tip" form component
// Handles amount input, submission state, and updating the tip feed after success.

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Send, Loader2, Zap } from "lucide-react";
import { sendTip, getTips } from "../utils/contract";

/**
 * @param {Object}   props
 * @param {string}   props.walletAddress — Connected wallet public key (empty = not connected)
 * @param {Function} props.setTips       — Setter to refresh the tip feed after a successful tip
 */
export default function TipForm({ walletAddress, setTips }) {
  const [amount, setAmount]     = useState("1");   // XLM amount (as string for input control)
  const [loading, setLoading]   = useState(false); // TX pending state
  const [txHash, setTxHash]     = useState(null);  // Store hash of last successful tx

  // ── Preset tip amounts for quick selection ─────────────────────────────
  const PRESETS = [0.5, 1, 2, 5, 10];

  // ── Submit Handler ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate wallet is connected
    if (!walletAddress) {
      toast.error("Please connect your Freighter wallet first");
      return;
    }

    const parsedAmount = parseFloat(amount);

    // Validate amount
    if (isNaN(parsedAmount) || parsedAmount < 0.1) {
      toast.error("Minimum tip is 0.1 XLM");
      return;
    }

    setLoading(true);
    setTxHash(null);

    // Show a persistent "pending" toast while tx is in-flight
    const pendingToastId = toast.loading(
      `Sending ${parsedAmount} XLM tip… Approve in Freighter 🚀`,
      { duration: Infinity }
    );

    try {
      // Submit the transaction via the contract utility
      const hash = await sendTip(walletAddress, parsedAmount);
      setTxHash(hash);

      // Dismiss loading toast and show success
      toast.dismiss(pendingToastId);
      toast.success(
        <span>
          ✦ Tip sent!{" "}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="underline text-brand-400"
          >
            View on Explorer ↗
          </a>
        </span>,
        { duration: 8000 }
      );

      // Reset the amount field
      setAmount("1");

      // Refresh the tip feed by re-fetching from the contract
      const freshTips = await getTips();
      setTips(freshTips);
    } catch (err) {
      toast.dismiss(pendingToastId);
      console.error("sendTip error:", err);

      // Provide helpful error messages for common failures
      let message = err.message || "Transaction failed";
      if (message.includes("insufficient")) {
        message = "Insufficient XLM balance. Get test XLM from friendbot.stellar.org";
      } else if (message.includes("rejected") || message.includes("User declined")) {
        message = "Transaction rejected in Freighter";
      }
      toast.error(message, { duration: 7000 });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(walletAddress);

  return (
    <div className="glass-card p-6 space-y-5 animate-slide-up">
      {/* ── Card Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-500/20">
          <Zap size={20} className="text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Send a Tip</h2>
          <p className="text-xs text-white/40">
            Tips go directly on-chain — no middlemen.
          </p>
        </div>
      </div>

      {/* ── Wallet Warning (if not connected) ────────────────────────── */}
      {!isConnected && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <span className="text-amber-400 text-sm">
            ⚠ Connect your Freighter wallet to send tips
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Amount Input ──────────────────────────────────────────── */}
        <div className="space-y-2">
          <label
            htmlFor="tip-amount"
            className="block text-sm font-medium text-white/60"
          >
            Amount (XLM)
          </label>

          <div className="relative">
            {/* Currency symbol */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm select-none">
              ✦
            </span>
            <input
              id="tip-amount"
              type="number"
              min="0.1"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder="1.0"
              className="input-field pl-8 pr-16 disabled:opacity-50"
              aria-label="Tip amount in XLM"
            />
            {/* XLM label */}
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold select-none">
              XLM
            </span>
          </div>

          {/* Quick-select preset amounts */}
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                disabled={loading}
                className={`
                  text-xs px-3 py-1.5 rounded-lg border transition-all duration-200
                  ${
                    parseFloat(amount) === preset
                      ? "bg-brand-500/30 border-brand-500 text-brand-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
                  }
                  disabled:opacity-40
                `}
              >
                {preset} XLM
              </button>
            ))}
          </div>
        </div>

        {/* ── Submit Button ─────────────────────────────────────────── */}
        <button
          id="send-tip-btn"
          type="submit"
          disabled={loading || !isConnected}
          className="
            btn-glow w-full flex items-center justify-center gap-2
            py-3.5 px-6 rounded-xl text-sm font-bold text-white
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
          "
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Send Tip ✦</span>
            </>
          )}
        </button>
      </form>

      {/* ── Last TX Hash (success state) ──────────────────────────────── */}
      {txHash && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 animate-fade-in">
          <p className="text-xs text-emerald-400 font-medium mb-1">
            ✓ Last transaction
          </p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-white/50 hover:text-brand-400 transition-colors break-all"
          >
            {txHash}
          </a>
        </div>
      )}
    </div>
  );
}
