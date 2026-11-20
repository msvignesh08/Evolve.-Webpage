import { useId } from 'react';

interface FocusLogoProps {
  className?: string;
}

export function FocusLogo({ className = 'h-9 w-9' }: FocusLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `evolve-bg-${uid}`;
  const arcId = `evolve-arc-${uid}`;
  const glowId = `evolve-glow-${uid}`;

  const r = 9.6;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75; // 270deg open ring from 12 o'clock to 9 o'clock

  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[26%] border border-white/25 bg-[#0b1222] shadow-[0_8px_22px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1b2e6e" />
            <stop offset="52%" stopColor="#0b1222" />
            <stop offset="100%" stopColor="#072e26" />
          </linearGradient>
          <linearGradient id={arcId} x1="25" y1="6" x2="8" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="48%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7cb3ff" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0b1222" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="36" height="36" fill={`url(#${bgId})`} />
        <circle cx="18" cy="18" r="14" fill={`url(#${glowId})`} />
        {/* Subtle dark track ring */}
        <circle
          cx="18"
          cy="18"
          r={r}
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth="3.2"
        />
        {/* 270-degree rounded-cap progress arc */}
        <circle
          cx="18"
          cy="18"
          r={r}
          stroke={`url(#${arcId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform="rotate(-90 18 18)"
        />
        {/* Crisp center focus point */}
        <circle cx="18" cy="18" r="2.9" fill="#f4f7fb" />
      </svg>
    </span>
  );
}
