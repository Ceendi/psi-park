import { clsx, type ClassValue } from 'clsx';

/**
 * Conditional className helper (PLAN §16.3). Thin wrapper over `clsx` so the
 * whole app has a single, consistent way to compose Tailwind classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
