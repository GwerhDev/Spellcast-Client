// Loose user match: a spell's userId and the session id come from the same
// source, but historical records may store it in a different type (e.g. number
// vs string after a backend change). Compare as strings so old spells still
// resolve, without ever matching a genuinely different user.
export const sameUser = (a: string | undefined, b: string | undefined): boolean =>
  a != null && b != null && String(a) === String(b);

// Whether a spell is one of the caster's own transcriptions, in their grimoire: the only
// spells they may edit or delete. Today that's a spell record stored for this caster;
// once shared spells can be opened, those won't match until the caster transcribes one.
export const isInCasterGrimoire = (spellUserId: string | undefined, casterId: string | undefined): boolean =>
  sameUser(spellUserId, casterId);
