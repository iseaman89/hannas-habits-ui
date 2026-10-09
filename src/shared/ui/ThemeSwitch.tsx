import { useId } from 'react';
import { Moon, Sun } from 'lucide-react';
import type { Theme } from '@/shared/lib/theme';

const options = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const satisfies ReadonlyArray<{ value: Theme; label: string; Icon: typeof Sun }>;

interface ThemeSwitchProps {
  value: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * Sun/moon segmented control. Two real radio inputs (visually hidden) inside labels: arrow keys,
 * focus and "exactly one selected" come from the browser instead of hand-written key handling.
 *
 * As wide as its two round buttons where it sits in a row (the top bar on a phone); where a
 * column stretches it (the sidebar) the two halves share the width.
 */
export function ThemeSwitch({ value, onChange }: ThemeSwitchProps) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex gap-0.5 rounded-full bg-neutral-200 p-0.5 sm:gap-1 sm:p-1"
    >
      {options.map(({ value: option, label, Icon }) => (
        <label key={option} className="flex-1 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="peer sr-only"
          />
          <span className="flex h-7 min-w-7 w-full items-center justify-center rounded-full sm:h-9 sm:min-w-9 text-neutral-700 transition-colors hover:text-text peer-checked:bg-bg peer-checked:text-accent-700 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            <Icon className="size-[18px]" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
