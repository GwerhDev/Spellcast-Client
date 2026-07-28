export type AssetCategory = 'sound-background' | 'page-background' | 'companion';
export type UnlockMethod = 'free' | 'purchase' | 'achievement';

interface BaseAsset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  unlockMethod: UnlockMethod;
  price?: number;
  achievementId?: string;
  tags: string[];
}

export interface SoundBackground extends BaseAsset {
  category: 'sound-background';
  streamUrl: string;
  loop: boolean;
  available?: boolean;
}

export interface PageBackground extends BaseAsset {
  category: 'page-background';
  cssValue: string | null;
  thumbnail: string;
  textColor?: string;
  highlightColor?: string;
  sentenceHoverColor?: string;
}

export interface CompanionModel {
  id: string;
  color: string;
  // No real .glb exists yet — models render as simple colored geometry (see CatModel).
  // Kept here so a future model file can be wired in without touching the catalog shape.
  modelUrl?: string;
}

export interface Companion extends BaseAsset {
  category: 'companion';
  models: CompanionModel[];
  thumbnail: string;
  scale?: number;
  speed?: number;
  // Shown as visible-but-locked ("Soon") ahead of its public release (see companions.ts),
  // instead of following its normal unlockMethod — set per environment, not hand-authored.
  comingSoon?: boolean;
}

export type Asset = SoundBackground | PageBackground | Companion;
