import type { Asset } from '../config/assets';
import type { Translations } from './types';

type AssetCopy = { name: string; description: string };

// Localized name/description/tags for a catalog item; falls back to the catalog's own
// English copy for anything not in the locale yet.
const copyFor = (t: Translations, asset: Asset): AssetCopy | undefined =>
  (t.assets.items as Record<string, AssetCopy>)[asset.id];

export const assetName = (t: Translations, asset: Asset) => copyFor(t, asset)?.name ?? asset.name;
export const assetDescription = (t: Translations, asset: Asset) => copyFor(t, asset)?.description ?? asset.description;
export const assetTag = (t: Translations, tag: string) => (t.assets.tags as Record<string, string>)[tag] ?? tag;
