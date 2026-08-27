import JSZip from 'jszip';
import type { TimelineEntry } from '../services/tts';
import { getSpellById, saveSpellToDB } from '../db';
import { getOriginalPdf, setOriginalPdf } from '../db/originalPdfs';
import { getCachedAudioEntriesForSpell, setCachedAudio, type CachedAudioEntry } from '../db/audioCache';

// .spell is a ZIP container (TCORE-78): manifest.json + spell.json (required) +
// original/ (optional: originalPagesContent.json always when present, original.pdf only
// when explicitly requested) + renders/<voice>/ (optional, audio+timeline pairs, always
// co-located — never packaged separately). Bumping this invalidates nothing on its own;
// importSpellFromFile() rejects a manifest with a formatVersion it doesn't recognize, so
// this only needs to change on an actual container-shape change.
//
// Bumped 1 -> 2 (TCORE-90): the original PDF moved out of the Spell record into its own
// store (src/db/originalPdfs.ts), and the folder was renamed source/ -> original/ to match.
// v1 files are still importable (see importSpellFromFile) — their bundled PDF, if any, is
// simply ignored (never migrated into the new store) per the ticket's own call.
//
// Bumped 2 -> 3 (TCORE-97): manifest.json can now carry description/author/tags/language
// (social/feed metadata) — unlike `progress`, this DOES travel with the work. v1/v2 files
// are still importable; they simply predate these fields, which come back undefined.
export const SPELL_FORMAT_VERSION = 3;

export interface SpellManifest {
  formatVersion: number;
  title: string;
  exportedAt: string;
  hasOriginalPdf: boolean;
  voices: string[];
  description?: string;
  author?: string;
  tags?: string[];
  language?: string;
}

export interface ExportSpellOptions {
  /**
   * Bundle original/original.pdf, when one is stored for this spell. Gates ONLY the PDF
   * binary (the heavy part) — original/originalPagesContent.json (needed for revert) is
   * bundled whenever the record has it, independent of this flag.
   */
  includeSource?: boolean;
  /** Bundle renders/<voice>/ (cached audio + timelines), when any are cached for this spell. */
  includeAudio?: boolean;
}

export interface ExportSpellResult {
  blob: Blob;
  filename: string;
}

const sanitizeFilename = (title: string): string => {
  const cleaned = title.trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'spell';
};

const blobExtension = (blob: Blob): string => {
  const type = blob.type.toLowerCase();
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('webm')) return 'webm';
  return 'audio';
};

/**
 * Reads a Spell (and, optionally, its cached audio) from IndexedDB and assembles a
 * .spell ZIP in memory. Never includes `progress` — a reader's personal position is
 * not part of the work, and must never travel in a shared .spell — so the exported
 * object below is built by picking only the fields that belong to the work, not by
 * spreading the full record and deleting `progress` after the fact.
 */
export async function exportSpellToBlob(
  spellId: string,
  userId: string,
  options: ExportSpellOptions = {},
): Promise<ExportSpellResult> {
  const spell = await getSpellById(spellId, userId);
  if (!spell) throw new Error('Spell not found.');

  const includeSource = options.includeSource ?? false;
  const includeAudio = options.includeAudio ?? false;

  const zip = new JSZip();

  zip.file('spell.json', JSON.stringify({
    title: spell.title,
    pagesContent: spell.pagesContent ?? '[]',
  }));

  // originalPagesContent is small JSON, needed for revert-to-original on the receiving
  // end — it travels whenever present, regardless of includeSource (that toggle is only
  // about the much heavier PDF binary below).
  if (spell.originalPagesContent) {
    zip.file('original/originalPagesContent.json', spell.originalPagesContent);
  }

  // Only look up the PDF store at all when actually requested — it's the one genuinely
  // heavy, opt-in part of a .spell export.
  const originalPdf = includeSource ? await getOriginalPdf(spellId) : null;
  const hasOriginalPdf = !!originalPdf;
  if (originalPdf) zip.file('original/original.pdf', await originalPdf.arrayBuffer());

  let voices: string[] = [];
  if (includeAudio) {
    const entries = await getCachedAudioEntriesForSpell(spellId);
    const byVoice = new Map<string, CachedAudioEntry[]>();
    for (const entry of entries) {
      const list = byVoice.get(entry.voice) ?? [];
      list.push(entry);
      byVoice.set(entry.voice, list);
    }
    voices = Array.from(byVoice.keys());
    for (const [voice, voiceEntries] of byVoice) {
      for (const entry of voiceEntries) {
        const ext = blobExtension(entry.blob);
        zip.file(`renders/${voice}/page-${entry.page}.${ext}`, await entry.blob.arrayBuffer());
        zip.file(`renders/${voice}/page-${entry.page}.timeline.json`, JSON.stringify(entry.timeline));
      }
    }
  }

  // manifest.json goes in last so its `voices`/`hasOriginalPdf` flags reflect what was
  // actually written above, not what was requested.
  const manifest: SpellManifest = {
    formatVersion: SPELL_FORMAT_VERSION,
    title: spell.title,
    exportedAt: new Date().toISOString(),
    hasOriginalPdf,
    voices,
    description: spell.description,
    author: spell.author,
    tags: spell.tags,
    language: spell.language,
  };
  zip.file('manifest.json', JSON.stringify(manifest));

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, filename: `${sanitizeFilename(spell.title)}.spell` };
}

/** Triggers a browser download of a Blob — no existing reusable helper for this in the app. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export class SpellImportError extends Error {}

const readZipFile = async (zip: JSZip, path: string): Promise<string | null> => {
  const entry = zip.file(path);
  if (!entry) return null;
  return entry.async('string');
};

const readZipBlob = async (zip: JSZip, path: string, mimeType?: string): Promise<Blob | null> => {
  const entry = zip.file(path);
  if (!entry) return null;
  const arrayBuffer = await entry.async('arraybuffer');
  return new Blob([arrayBuffer], mimeType ? { type: mimeType } : undefined);
};

/**
 * Unzips a .spell file and hydrates it into a brand-new Spell record (+ audio_pages
 * cache entries, if renders/ is present). Always creates a NEW id — ids are local to a
 * browser/user, not portable, so the imported spell never reuses whatever id it had in
 * the exporting instance (audio cache keys are built from the new id accordingly).
 * Returns the new spell's id so the caller can navigate to it / invalidate the list.
 */
export async function importSpellFromFile(file: File, userId: string): Promise<string> {
  // Read as ArrayBuffer rather than handing JSZip the File/Blob directly — avoids any
  // environment-specific Blob-support detection ambiguity, at the cost of nothing (the
  // whole file has to be read into memory either way for a ZIP central-directory parse).
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const manifestJson = await readZipFile(zip, 'manifest.json');
  if (!manifestJson) throw new SpellImportError('Not a valid .spell file: missing manifest.json.');
  const manifest = JSON.parse(manifestJson) as SpellManifest & { hasSource?: boolean };
  // v1 (TCORE-78) is still importable: its bundled PDF (if any) is intentionally dropped
  // rather than migrated into the new store (see SPELL_FORMAT_VERSION's comment) — only
  // its originalPagesContent JSON, if present, is worth carrying over for revert. v2
  // (TCORE-90) predates description/author/tags/language (TCORE-97) — those simply come
  // back undefined for either legacy version.
  const SUPPORTED_IMPORT_VERSIONS = [1, 2, SPELL_FORMAT_VERSION];
  if (!SUPPORTED_IMPORT_VERSIONS.includes(manifest.formatVersion)) {
    throw new SpellImportError(`Unsupported .spell format version: ${manifest.formatVersion}.`);
  }
  const sourceFolder = manifest.formatVersion === 1 ? 'source' : 'original';

  const spellJson = await readZipFile(zip, 'spell.json');
  if (!spellJson) throw new SpellImportError('Not a valid .spell file: missing spell.json.');
  const { title, pagesContent } = JSON.parse(spellJson) as { title: string; pagesContent: string };

  const originalPagesContent = await readZipFile(zip, `${sourceFolder}/originalPagesContent.json`);
  // v1 only: its bundled PDF, if any, is never read back at all. v2 and v3 both use the
  // original/ folder shape, so both must be read here -- gating this on
  // `formatVersion === SPELL_FORMAT_VERSION` would silently stop reading v2 files' PDFs
  // the moment the constant bumps for an unrelated reason (exactly what TCORE-97 did).
  const originalPdf = manifest.formatVersion !== 1
    ? await readZipBlob(zip, 'original/original.pdf', 'application/pdf')
    : null;

  const newSpellId = await saveSpellToDB({
    title,
    userId,
    pagesContent,
    originalPagesContent: originalPagesContent ?? undefined,
    description: manifest.description,
    author: manifest.author,
    tags: manifest.tags,
    language: manifest.language,
  });

  if (originalPdf) await setOriginalPdf(newSpellId, originalPdf);

  for (const voice of manifest.voices) {
    const voiceFolder = zip.folder(`renders/${voice}`);
    if (!voiceFolder) continue;
    const timelineFiles = Object.keys(zip.files).filter(
      (path) => path.startsWith(`renders/${voice}/`) && path.endsWith('.timeline.json'),
    );
    for (const timelinePath of timelineFiles) {
      const pageMatch = timelinePath.match(/page-(\d+)\.timeline\.json$/);
      if (!pageMatch) continue;
      const page = Number(pageMatch[1]);
      const timelineJson = await readZipFile(zip, timelinePath);
      if (!timelineJson) continue;
      const timeline = JSON.parse(timelineJson) as TimelineEntry[];

      const audioPath = Object.keys(zip.files).find(
        (path) => path.startsWith(`renders/${voice}/page-${page}.`) && !path.endsWith('.timeline.json'),
      );
      if (!audioPath) continue;
      const audioBlob = await readZipBlob(zip, audioPath);
      if (!audioBlob) continue;

      await setCachedAudio(newSpellId, page, voice, audioBlob, timeline);
    }
  }

  return newSpellId;
}
