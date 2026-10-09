/** Joins class names, skipping the falsy ones: `cn('a', cond && 'b', className)`. */
export function cn(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
