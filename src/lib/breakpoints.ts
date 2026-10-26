/**
 * Breakpoint Tokens (SPEC_R2 2.0).
 * xs: 360-479
 * sm: 480-767
 * md: 768-1023
 * lg: 1024-1439
 * xl: 1440+
 */

export const BREAKPOINTS = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export function getBreakpoint(width: number): BreakpointKey {
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}
