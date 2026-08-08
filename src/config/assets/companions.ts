import type { Companion } from './types';

// "Cats" is holding for a public launch on 2026-08-10 — stays visible (but locked,
// with a "Soon" badge) in the Havenstore in production until then; fully unlockable
// in dev/test builds regardless of the date. Uses Vite's own import.meta.env.DEV
// rather than the custom VITE_ENV var, since DEV/PROD are always set correctly by
// Vite itself at build time and can't leak through a missing or misconfigured
// deploy env var. Once this date passes, comingSoon flips to false on its own —
// no manual code edit needed at launch time.
const CATS_RELEASE_DATE = new Date('2026-08-10T00:00:00');

export const companions: Companion[] = [
  {
    id: 'cats',
    name: 'Cats',
    description: 'A pair of cats that wander around while you read.',
    category: 'companion',
    unlockMethod: 'free',
    // Both models point at the black cat .glb as a shared placeholder while an
    // orange-specific model is sourced — swap `orange`'s modelUrl once it lands.
    models: [
      { id: 'orange', color: '#e0793c', modelUrl: '/models/cats/black/scene.gltf' },
      { id: 'black', color: '#2b2b2b', modelUrl: '/models/cats/black/scene.gltf' },
    ],
    thumbnail: '#3a2a1e',
    scale: 1,
    speed: 0.6,
    tags: ['cats', 'companion', 'pet'],
    comingSoon: !import.meta.env.DEV && new Date() < CATS_RELEASE_DATE,
  },
];
