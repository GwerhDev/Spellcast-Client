import type { Companion } from './types';

// "Cats" is holding for a public launch on 2026-08-11 — stays visible (but locked,
// with a "Soon" badge) in the Havenstore in production until then; fully unlockable
// in dev/test builds. Uses Vite's own import.meta.env.DEV rather than the custom
// VITE_ENV var, since DEV/PROD are always set correctly by Vite itself at build time
// and can't leak through a missing or misconfigured deploy env var.
export const companions: Companion[] = [
  {
    id: 'cats',
    name: 'Cats',
    description: 'A pair of cats that wander around while you read.',
    category: 'companion',
    unlockMethod: 'free',
    models: [
      { id: 'orange', color: '#e0793c' },
      { id: 'black', color: '#2b2b2b' },
    ],
    thumbnail: '#3a2a1e',
    scale: 1,
    speed: 0.6,
    tags: ['cats', 'companion', 'pet'],
    comingSoon: !import.meta.env.DEV,
  },
];
