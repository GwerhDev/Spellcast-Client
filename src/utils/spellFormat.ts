import JSZip from 'jszip';
import type { TimelineEntry } from '../services/tts';
import { getSpellById, saveSpellToDB } from '../db';
import { getCachedAudioEntriesForSpell, setCachedAudio, type CachedAudioEntry } from '../db/audioCache';

// .spell is a ZIP container (TCORE-78): manifest.json + spell.json (required) +
// source/ (optional, original PDF) + renders/<voice>/ (optional, audio+timeline pairs,
// always co-located — never packaged separately). Bumping this invalidates nothing on
// its own; importSpellFromFile() rejects a manifest with a formatVersion it doesn't
// recognize, so this only needs to change on an actual container-shape change.
export const SPELL_FORMAT_VERSION = 1;

export interface SpellManifest {
  formatVersion: number;
  title: string;
  exportedAt: string;
  hasSource: boolean;
  voices: string[];
}

export interface ExportSpellOptions {
  /** Bundle source/ (the original PDF + its extracted pages), when present on the record. */
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

  const hasSource = includeSource && !!(spell.originalPdf || spell.originalPagesContent);
  if (hasSource) {
    if (spell.originalPdf) zip.file('source/original.pdf', await spell.originalPdf.arrayBuffer());
    if (spell.originalPagesContent) zip.file('source/originalPagesContent.json', spell.originalPagesContent);
  }

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

  // manifest.json goes in last so its `voices`/`hasSource` flags reflect what was
  // actually written above, not what was requested.
  const manifest: SpellManifest = {
    formatVersion: SPELL_FORMAT_VERSION,
    title: spell.title,
    exportedAt: new Date().toISOString(),
    hasSource,
    voices,
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
  const manifest = JSON.parse(manifestJson) as SpellManifest;
  if (manifest.formatVersion !== SPELL_FORMAT_VERSION) {
    throw new SpellImportError(`Unsupported .spell format version: ${manifest.formatVersion}.`);
  }

  const spellJson = await readZipFile(zip, 'spell.json');
  if (!spellJson) throw new SpellImportError('Not a valid .spell file: missing spell.json.');
  const { title, pagesContent } = JSON.parse(spellJson) as { title: string; pagesContent: string };

  const originalPdf = manifest.hasSource ? await readZipBlob(zip, 'source/original.pdf', 'application/pdf') : null;
  const originalPagesContent = manifest.hasSource ? await readZipFile(zip, 'source/originalPagesContent.json') : null;

  const newSpellId = await saveSpellToDB({
    title,
    userId,
    pagesContent,
    // The original PDF (when bundled) doubles as both `pdf` and `originalPdf` — this
    // mirrors how a fresh PDF upload seeds both fields identically at creation time.
    pdf: originalPdf ?? undefined,
    originalPdf: originalPdf ?? undefined,
    originalPagesContent: originalPagesContent ?? undefined,
  });

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
