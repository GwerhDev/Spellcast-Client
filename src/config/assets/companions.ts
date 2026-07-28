import { VITE_ENV } from '../api';
import type { Companion } from './types';

// "Cats" is holding for a public launch on 2026-08-11 — gated out of the production
// catalog (VITE_ENV === 'production') until then, but left enabled in every other
// environment so it stays testable during development.
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

export const companions: Companion[] = allCompanions.filter(c => !c.devOnly || VITE_ENV !== 'production');
