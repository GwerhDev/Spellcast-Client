// A spell's pick of a cosmetic against the caster's default, as every cosmetic resolves it
// (its cover frame, page background, sound background, companion): undefined -- the spell
// never picked -- follows the default; null (explicitly none) or an asset id wins over it.
export const resolveAssetChoice = (spellChoice: string | null | undefined, defaultId: string | null): string | null =>
  spellChoice === undefined ? defaultId : spellChoice;
