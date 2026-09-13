import type { CoverFrame } from './types';

export const coverFrames: CoverFrame[] = [
  {
    id: 'grimoire',
    name: 'Grimoire',
    description: 'Bronze corner plates and clasp medallions, like an old spellbook',
    category: 'cover-frame',
    unlockMethod: 'free',
    // TCORE-123 follow-up: 4 fixed-size corner images (never stretched -- see CoverFrame's
    // own comment in config/assets/types.ts for why) + a plain CSS border for the straight
    // banding between them + a small clasp/gem centered on the top/bottom edges.
    cornerImageUrl: '/frames/grimoire-corner.svg',
    edgeColor: '#7a4d24',
    medallionImageUrl: '/frames/grimoire-medallion.svg',
    // TCORE-124: same SVGs, extruded into 3D meshes by CoverFrameMesh instead of a
    // separate model file -- see CoverFrame's own comment in config/assets/types.ts.
    corner3dUrl: '/frames/grimoire-corner.svg',
    medallion3dUrl: '/frames/grimoire-medallion.svg',
    thumbnail: '#8a5a2b',
    tags: ['fantasy', 'ornate', 'bronze'],
  },
];
