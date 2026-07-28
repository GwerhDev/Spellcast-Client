import type { Companion } from './types';

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
  },
];
