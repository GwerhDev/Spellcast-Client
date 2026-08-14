import type { Companion } from './types';

// "Kuro & Sunny" (the cats companion) is holding for a public launch on 2026-08-10 —
// stays visible (but locked, with a "Soon" badge) in the Havenstore in production
// until then; fully unlockable in dev/test builds regardless of the date. Uses Vite's
// own import.meta.env.DEV
// rather than the custom VITE_ENV var, since DEV/PROD are always set correctly by
// Vite itself at build time and can't leak through a missing or misconfigured
// deploy env var. Once this date passes, comingSoon flips to false on its own —
// no manual code edit needed at launch time.
const CATS_RELEASE_DATE = new Date('2026-08-10T00:00:00');

export const companions: Companion[] = [
  {
    // `id: 'cats'` stays as the internal identifier (persisted in unlockedIds/
    // activeCompanionId and hardcoded as useCompanionGiftAnnouncement's
    // GIFT_COMPANION_ID) — only the display name changed, not the id.
    id: 'cats',
    name: 'Kuro & Sunny',
    description: 'A pair of cats that wander around while you read.',
    category: 'companion',
    unlockMethod: 'free',
    // "orange" (Sunny) points at its own recolored copy of the black cat (Kuro) asset
    // (same mesh/rig, fur textures recolored to the color below — see
    // public/models/cats/orange and its generating scripts). The fur-card atlas
    // (alphaMode BLEND) gets a flat tint replace where visible; the opaque body skin
    // textures get a luminance-preserving colorize (tint * per-pixel luminance +
    // brightness boost) so their baked shading/fur detail survives instead of
    // flattening into a solid silhouette.
    models: [
      { id: 'orange', color: '#e0863c', modelUrl: '/models/cats/orange/scene.gltf' },
      { id: 'black', color: '#2b2b2b', modelUrl: '/models/cats/black/scene.gltf' },
    ],
    thumbnail: '#3a2a1e',
    scale: 1,
    speed: 0.6,
    tags: ['cats', 'companion', 'pet'],
    comingSoon: !import.meta.env.DEV && new Date() < CATS_RELEASE_DATE,
    // Must go through an explicit unlock (the gift modal's Activate button, or
    // Havenstore's own Unlock button) — never silently auto-granted via FREE_IDS the
    // moment comingSoon flips false. Without this, every session with no prior
    // unlockedIds (i.e. any first-time visitor after 2026-08-10) would start with
    // 'cats' already unlocked, which blocks the gift modal's own `!isUnlocked` check
    // before it ever gets a chance to show — exactly the bug that shipped.
    requiresExplicitUnlock: true,
  },
];
