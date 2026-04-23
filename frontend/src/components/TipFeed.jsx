// TipFeed.jsx — Displays the live feed of recent on-chain tips.
// Shows a styled card list sorted newest-first (reversed in contract.js).
// If no tips exist yet, shows a friendly empty state.

import React from "react";
import { History, Star, TrendingUp } from "lucide-react";
import { truncateAddress } from "../utils/contract";

/**
 * Formats a relative time string.
 * Since Soroban doesn't store timestamps in our simple contract,
 * we show placeholder times. In a more advanced version you could
 * include block time or a timestamp field in TipEntry.
 */
function RelativeTime({ index }) {
  // Simulate "time ago" based on feed position (most recent = 0 = "just now")
  if (index === 0) return <span className="text-emerald-400">just now</span>;
  if (index < 3) return <span className="text-white/40">recently</span>;
  return <span className="text-white/30">earlier</span>;
}

/**
 * @param {Object} props
 * @param {Array}  props.tips — Array of { address: string, amount: number } objects
 */
export default function TipFeed({ tips }) {
  // ── Calculate Stats ──────────────────────────────────────────────────
  const totalXLM = tips.reduce((sum, t) => sum + t.amount, 0);
  const uniqueTippers = new Set(tips.map((t) => t.address)).size;

  return (
    <div className="glass-card p-6 space-y-5 animate-slide-up">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-500/20">
            <History size={20} className="text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Recent Tippers</h2>
            <p className="text-xs text-white/40">Live on-chain feed</p>
          </div>
        </div>

        {/* Live indicator badge */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* ── Stats Row (shown if tips exist) ──────────────────────────── */}
      {tips.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {/* Total XLM tipped */}
          <div className="bg-surface-700 rounded-xl p-3 flex items-center gap-2">
            <Star size={16} className="text-brand-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/40">Total Tipped</p>
              <p className="text-sm font-bold text-white">
                {totalXLM.toFixed(2)} XLM
              </p>
            </div>
          </div>
          {/* Unique tippers */}
          <div className="bg-surface-700 rounded-xl p-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/40">Tippers</p>
              <p className="text-sm font-bold text-white">{uniqueTippers}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tip List ─────────────────────────────────────────────────── */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {tips.length === 0 ? (
          // ── Empty State ──────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">🫙</div>
            <p className="text-white/50 font-medium">
              No tips yet — be the first!
            </p>
            <p className="text-white/25 text-xs mt-1">
              Connect your Freighter wallet and send a tip above.
            </p>
          </div>
        ) : (
          // ── Tip Rows ─────────────────────────────────────────────────
          tips.map((tip, index) => (
            <TipRow key={`${tip.address}-${index}`} tip={tip} index={index} />
          ))
        )}
      </div>

      {/* ── Footer: Total count ───────────────────────────────────────── */}
      {tips.length > 0 && (
        <p className="text-xs text-center text-white/25 pt-1">
          Showing {tips.length} tip{tips.length !== 1 ? "s" : ""} • All stored on Stellar Testnet
        </p>
      )}
    </div>
  );
}

// ── Individual Tip Row Component ───────────────────────────────────────────
function TipRow({ tip, index }) {
  // Generate a deterministic "avatar" color from the address
  const hue = tip.address
    ? tip.address.charCodeAt(6) * 137.5 % 360
    : index * 60;

  return (
    <div
      className="
        flex items-center justify-between
        bg-surface-700 hover:bg-surface-600
        border border-white/5 hover:border-white/10
        rounded-xl px-4 py-3
        transition-all duration-200 cursor-default
        group
      "
    >
      {/* Left: Avatar + address */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Color avatar based on address */}
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{
            background: `hsl(${hue}, 70%, 35%)`,
            border: `1.5px solid hsl(${hue}, 70%, 55%)`,
          }}
        >
          {tip.address ? tip.address.charAt(1).toUpperCase() : "?"}
        </div>

        {/* Address + time */}
        <div className="min-w-0">
          <p
            className="text-sm font-mono text-white/80 group-hover:text-white transition-colors truncate"
            title={tip.address} // Show full address on hover
          >
            {truncateAddress(tip.address)}
          </p>
          <p className="text-xs">
            <RelativeTime index={index} />
          </p>
        </div>
      </div>

      {/* Right: Amount badge */}
      <div className="flex-shrink-0 ml-3">
        <span className="badge-purple font-mono">
          ✦ {tip.amount.toFixed(tip.amount < 1 ? 2 : 1)} XLM
        </span>
      </div>
    </div>
  );
}
