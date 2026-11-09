import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBookOpen, faBox, faCircleInfo, faCloud, faFingerprint, faHardDrive, faPalette, faPenNib,
  faShield, faSliders, faVolumeHigh, faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

// The app's settings, as the search finds them (by their name, what they're for, or their
// keywords: see i18n's `search`). Each opens a settings page (its route) or a panel: the
// reader's (only while a Spell is open), the player's, or the editor's (only in the editor).
export type SettingsSearchKey =
  | 'appearance' | 'credentials' | 'permissions' | 'storage' | 'localStorage' | 'audioCache'
  | 'spellsStorage' | 'cloudStorage' | 'about' | 'readerSettings' | 'playerSettings' | 'editorSettings';

export type SettingsPanel = 'reader' | 'player' | 'editor';

export interface SettingsSearchEntry {
  key: SettingsSearchKey;
  icon: IconDefinition;
  path?: string;
  panel?: SettingsPanel;
}

export const settingsSearchEntries: SettingsSearchEntry[] = [
  { key: 'appearance', icon: faPalette, path: '/caster/settings/appearance' },
  { key: 'credentials', icon: faFingerprint, path: '/caster/settings/credentials' },
  { key: 'permissions', icon: faShield, path: '/caster/settings/permissions' },
  { key: 'storage', icon: faBox, path: '/caster/settings/storage' },
  { key: 'localStorage', icon: faHardDrive, path: '/caster/settings/storage/local' },
  { key: 'audioCache', icon: faVolumeHigh, path: '/caster/settings/storage/local/audio-cache' },
  { key: 'spellsStorage', icon: faWandMagicSparkles, path: '/caster/settings/storage/local/spells' },
  { key: 'cloudStorage', icon: faCloud, path: '/caster/settings/storage/cloud' },
  { key: 'about', icon: faCircleInfo, path: '/caster/settings/about' },
  { key: 'readerSettings', icon: faBookOpen, panel: 'reader' },
  { key: 'playerSettings', icon: faSliders, panel: 'player' },
  { key: 'editorSettings', icon: faPenNib, panel: 'editor' },
];

/** Whether an entry is offered now: a panel only where it applies. */
export const isOffered = (entry: SettingsSearchEntry, where: { spellOpen: boolean; inEditor: boolean }) =>
  entry.panel === 'reader' ? where.spellOpen : entry.panel === 'editor' ? where.inEditor : true;

/** Whether an entry matches a query: by its name, what it's for, or its keywords. */
export const matchesQuery = (texts: { label: string; desc: string; keywords: string }, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${texts.label} ${texts.desc} ${texts.keywords}`.toLowerCase();
  return q.split(/\s+/).every(word => haystack.includes(word));
};
