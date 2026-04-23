// WalletConnect.jsx — Freighter wallet connection button component
// Handles detecting Freighter, requesting access (popup), getting the
// public key, and showing the connected address in a styled badge.

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Wallet, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { connectWallet, truncateAddress, isFreighterInstalled } from "../utils/contract";

/**
 * @param {Object}   props
 * @param {string}   props.walletAddress    — Current connected address (empty if not connected)
 * @param {Function} props.setWalletAddress — Setter to update parent state
 */
export default function WalletConnect({ walletAddress, setWalletAddress }) {
  const [connecting, setConnecting] = useState(false);

  // ── Handle Connect ─────────────────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Go straight to connectWallet() — it calls requestAccess() then getPublicKey().
      // If Freighter isn't installed, requestAccess() throws a clear error.
      const address = await connectWallet();
      setWalletAddress(address);
      toast.success(`Wallet connected: ${truncateAddress(address)}`);
    } catch (err) {
      console.error("Wallet connect failed:", err);
      const msg = err.message ?? "";
      if (msg.includes("not installed") || msg.includes("not found") || msg.includes("undefined")) {
        toast.error(
          <span>
            Freighter not found.{" "}
            <a href="https://freighter.app/" target="_blank" rel="noreferrer" className="underline text-brand-400">
              Install it here ↗
            </a>
          </span>
        );
      } else {
        toast.error(msg || "Failed to connect. Is Freighter unlocked?");
      }
    } finally {
      setConnecting(false);
    }
  };

  // ── Handle Disconnect ──────────────────────────────────────────────────
  const handleDisconnect = () => {
    setWalletAddress("");
    toast("Wallet disconnected", { icon: "👋" });
  };

  // ── Render: Connected State ────────────────────────────────────────────
  if (walletAddress) {
    return (
      <div className="flex items-center gap-3 animate-fade-in">
        {/* Green connected badge */}
        <div className="badge-green">
          {/* Pulsing dot indicator */}
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
          <CheckCircle2 size={12} />
          <span className="font-mono">{truncateAddress(walletAddress)}</span>
        </div>

        {/* Full address tooltip on hover (desktop) */}
        <button
          onClick={handleDisconnect}
          title={`Connected: ${walletAddress}\nClick to disconnect`}
          className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200 underline-offset-2 hover:underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Render: Not Connected State ────────────────────────────────────────
  return (
    <button
      id="connect-wallet-btn"
      onClick={handleConnect}
      disabled={connecting}
      className="
        btn-glow flex items-center gap-2 px-5 py-2.5 rounded-xl
        text-sm font-semibold text-white
        disabled:opacity-60 disabled:cursor-not-allowed
      "
    >
      {connecting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <Wallet size={16} />
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
}
