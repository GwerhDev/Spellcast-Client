// The caster asked their system for less motion: what flies, deals or melts is skipped and
// things are just where they end up. Read when it's needed (not kept), so it follows a
// change of the setting without a reload.
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
