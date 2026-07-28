import type { Companion } from './types';

// "Cats" is holding for a public launch on 2026-08-11 — gated out of any built
// (production) bundle until then. Uses Vite's own import.meta.env.DEV rather than the
// custom VITE_ENV var, since DEV/PROD are always set correctly by Vite itself at build
// time and can't leak through a missing or misconfigured deploy env var.
const allCompanions: Companion[] = [
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
    devOnly: true,
  },
];

export const companions: Companion[] = allCompanions.filter(c => !c.devOnly || import.meta.env.DEV);
