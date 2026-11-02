import React from "react";

export function Wallet3DIcon({ className = "size-16 sm:size-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="w-bg-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="w-bill-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="w-bill-2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="w-wallet-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="w-wallet-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="w-wallet-flap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="w-coin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="w-coin-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <filter id="w-drop-shadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1e3a8a" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Background soft glow */}
      <circle cx="58" cy="52" r="42" fill="url(#w-bg-glow)" />

      {/* Bill 1 (behind) */}
      <g transform="rotate(-14 45 35)">
        <rect x="24" y="16" width="52" height="28" rx="5" fill="url(#w-bill-1)" stroke="#047857" strokeWidth="1" />
        <circle cx="50" cy="30" r="5" fill="#047857" opacity="0.4" />
        <rect x="28" y="20" width="44" height="20" rx="3" fill="none" stroke="#a7f3d0" strokeWidth="0.8" opacity="0.6" />
      </g>

      {/* Bill 2 (front) */}
      <g transform="rotate(8 65 30)">
        <rect x="42" y="18" width="54" height="30" rx="5" fill="url(#w-bill-2)" stroke="#059669" strokeWidth="1" />
        <circle cx="69" cy="33" r="6" fill="#047857" opacity="0.3" />
        <rect x="46" y="22" width="46" height="22" rx="3" fill="none" stroke="#ecfdf5" strokeWidth="0.8" opacity="0.7" />
      </g>

      {/* Gold Coin floating on left */}
      <g transform="translate(8, 22)">
        <circle cx="16" cy="16" r="13" fill="url(#w-coin-grad)" stroke="#b45309" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="url(#w-coin-inner)" strokeWidth="1.2" />
        <text x="16" y="20" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="bold" fontFamily="sans-serif">₹</text>
        <circle cx="12" cy="11" r="2.5" fill="#ffffff" opacity="0.7" />
      </g>

      {/* Wallet Back */}
      <rect x="18" y="32" width="84" height="54" rx="14" fill="url(#w-wallet-back)" />

      {/* Wallet Main Body with shadow */}
      <g filter="url(#w-drop-shadow)">
        <rect x="16" y="36" width="88" height="52" rx="14" fill="url(#w-wallet-body)" />
        <path d="M 22 40 C 45 37 75 37 98 40" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Wallet Front Pocket */}
      <path
        d="M 16 54 C 36 50 84 50 104 54 L 104 76 C 104 82.6 98.6 88 92 88 L 28 88 C 21.4 88 16 82.6 16 76 Z"
        fill="url(#w-wallet-flap)"
      />

      {/* Wallet Clasp */}
      <g filter="url(#w-drop-shadow)">
        <rect x="80" y="52" width="28" height="18" rx="9" fill="#1e40af" stroke="#60a5fa" strokeWidth="1" />
        <circle cx="90" cy="61" r="4.5" fill="url(#w-coin-grad)" stroke="#92400e" strokeWidth="0.8" />
        <circle cx="88.5" cy="59.5" r="1.2" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Sparkles */}
      <path d="M 8 18 Q 8 22 4 22 Q 8 22 8 26 Q 8 22 12 22 Q 8 22 8 18 Z" fill="#38bdf8" />
      <path d="M 110 32 Q 110 36 106 36 Q 110 36 110 40 Q 110 36 114 36 Q 110 36 110 32 Z" fill="#facc15" />
    </svg>
  );
}
