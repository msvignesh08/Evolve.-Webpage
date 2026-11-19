import { useId } from 'react';

interface FocusLogoProps {
  className?: string;
}

export function FocusLogo({ className = 'h-9 w-9' }: FocusLogoProps) {
  const uid = useId().replace(/:/g, '');
  const ringId = `focusos-ring-${uid}`;
  const glowId = `focusos-glow-${uid}`;

  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-[#0b1120] shadow-[0_6px_20px_rgba(37,99,235,0.28)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id={ringId} x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0b1120" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="36" height="36" fill="#0b1120" />
        <circle cx="18" cy="18" r="14" fill={`url(#${glowId})`} />
        <circle cx="18" cy="18" r="9.5" stroke={`url(#${ringId})`} strokeWidth="3.2" />
        <circle cx="18" cy="18" r="2.6" fill="#f8fafc" />
      </svg>
    </span>
  );
}
