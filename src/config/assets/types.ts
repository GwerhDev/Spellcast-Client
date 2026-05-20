export type AssetCategory = 'sound-background' | 'page-background';
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
}

export interface PageBackground extends BaseAsset {
  category: 'page-background';
  cssValue: string | null;
  thumbnail: string;
  textColor?: string;
  highlightColor?: string;
  sentenceHoverColor?: string;
}

export type Asset = SoundBackground | PageBackground;
