// App.jsx — Root application component
// Manages global state: connected wallet address and the live tips array.
// Fetches tip history on mount and passes data down to child components.

import React, { useState, useEffect, useCallback } from "react";
import { Star, RefreshCw, Github, ExternalLink } from "lucide-react";
import WalletConnect from "./components/WalletConnect.jsx";
import TipForm from "./components/TipForm.jsx";
import TipFeed from "./components/TipFeed.jsx";
import { getTips } from "./utils/contract.js";

export default function App() {
  // ── Global State ─────────────────────────────────────────────────────
  const [walletAddress, setWalletAddress] = useState(""); // Freighter public key
  const [tips, setTips]                   = useState([]);  // Array of { address, amount }
  const [refreshing, setRefreshing]       = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Fetch Tips from Contract ──────────────────────────────────────────
  const fetchTips = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await getTips();
      setTips(data);
    } catch (err) {
      console.warn("Could not fetch tips:", err.message);
      // Silently fail on initial load — contract might not be deployed yet
    } finally {
      if (showSpinner) setRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  // ── On Mount: Load Tips & Poll Every 30s ──────────────────────────────
  useEffect(() => {
    // Initial fetch
    fetchTips();

    // Auto-refresh every 30 seconds so the feed stays live
    const interval = setInterval(() => fetchTips(), 30_000);
    return () => clearInterval(interval); // cleanup on unmount
  }, [fetchTips]);

  return (
    <div className="min-h-screen bg-surface-900 relative overflow-x-hidden">

      {/* ── Background Decoration ──────────────────────────────────── */}
      {/* Radial gradient orbs for depth — pure CSS, no images */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        {/* Top-left brand orb */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
        />
        {/* Bottom-right accent orb */}
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #ec4899, transparent)" }}
        />
        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }}
        />
      </div>

      {/* ── Main Layout ───────────────────────────────────────────── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="space-y-4">
          {/* Top bar: logo + wallet */}
          <div className="flex items-center justify-between">
            {/* Logo mark */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <span className="text-lg">🫙</span>
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Crypto Tip Jar
              </span>
            </div>

            {/* Wallet connect button (top-right) */}
            <WalletConnect
              walletAddress={walletAddress}
              setWalletAddress={setWalletAddress}
            />
          </div>

          {/* Hero tagline */}
          <div className="text-center py-4">
            <h1 className="text-4xl font-black tracking-tight mb-2">
              <span className="gradient-text">Tip on Stellar.</span>
              <br />
              <span className="text-white/80 text-2xl font-semibold">
                No banks. No middlemen. On-chain.
              </span>
            </h1>
            <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
              Connect your Freighter wallet and send XLM tips directly to the
              smart contract on Stellar Soroban Testnet.
            </p>

            {/* Network badge */}
            <div className="mt-3 inline-flex items-center gap-2 badge-purple">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Stellar Testnet
            </div>
          </div>
        </header>

        {/* ── Tip Form ─────────────────────────────────────────────── */}
        <TipForm
          walletAddress={walletAddress}
          setTips={setTips}
        />

        {/* ── Tip Feed Header + Refresh ─────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-white/50 font-medium">
            {tips.length > 0 ? `${tips.length} tip${tips.length !== 1 ? "s" : ""} recorded` : "Tip history"}
          </span>
          <button
            onClick={() => fetchTips(true)}
            disabled={refreshing || initialLoading}
            title="Refresh tips"
            className="
              flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70
              transition-colors duration-200 disabled:opacity-30
            "
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* ── Tip Feed ─────────────────────────────────────────────── */}
        {initialLoading ? (
          // Loading skeleton
          <div className="glass-card p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-32" />
                  <div className="h-2.5 bg-white/5 rounded w-20" />
                </div>
                <div className="h-6 bg-white/10 rounded-full w-20" />
              </div>
            ))}
          </div>
        ) : (
          <TipFeed tips={tips} />
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="text-center space-y-2 pt-4 pb-6">
          <div className="flex items-center justify-center gap-4 text-xs text-white/25">
            <a
              href="https://soroban.stellar.org/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white/50 transition-colors"
            >
              <ExternalLink size={11} />
              Soroban Docs
            </a>
            <span>•</span>
            <a
              href="https://freighter.app/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white/50 transition-colors"
            >
              <ExternalLink size={11} />
              Freighter Wallet
            </a>
            <span>•</span>
            <a
              href="https://friendbot.stellar.org/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white/50 transition-colors"
            >
              <Star size={11} />
              Get Test XLM
            </a>
          </div>
          <p className="text-white/15 text-xs">
            Built on Stellar Soroban Testnet • For educational purposes
          </p>
        </footer>
      </div>
    </div>
  );
}
