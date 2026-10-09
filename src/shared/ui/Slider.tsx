import type { CSSProperties, InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import './slider.css';

interface SliderProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'aria-label'
> {
  /** The accessible name ("Body energy"). Required: a bare slider says nothing to a screen reader. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  tone?: 'accent' | 'accent-2';
}

/** A native `<input type="range">`: keyboard (arrows, Home/End, PageUp/Down) comes for free. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  tone = 'accent',
  className,
  ...rest
}: SliderProps) {
  const fraction = max > min ? (value - min) / (max - min) : 0;
  const style = { '--slider-pct': `${Math.min(1, Math.max(0, fraction)) * 100}%` } as CSSProperties;

  return (
    <input
      type="range"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      data-tone={tone}
      style={style}
      onChange={(event) => onChange(Number(event.target.value))}
      className={cn('hh-slider', className)}
      {...rest}
    />
  );
}
