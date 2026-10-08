import type { ReactNode } from 'react';

interface ProgressDonutProps {
  /** 0-100. Out-of-range values are clamped. */
  value: number;
  /** Diameter in px. */
  size?: number;
  /** Accessible description, e.g. "77% of 2026 is behind you". Defaults to the percentage. */
  label?: string;
  /** Shown in the hole. Defaults to the rounded percentage. */
  children?: ReactNode;
}

const STROKE = 16;

export function ProgressDonut({ value, size = 150, label, children }: ProgressDonutProps) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;

  return (
    <div
      role="img"
      aria-label={label ?? `${Math.round(percent)}%`}
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-neutral-300"
        />
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="stroke-accent transition-[stroke-dashoffset]"
        />
      </svg>
      <div className="absolute font-display text-3xl" aria-hidden>
        {children ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
}
