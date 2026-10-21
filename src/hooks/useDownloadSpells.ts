import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { useLanguage } from '../i18n';
import { exportSpellToBlob, downloadBlob, type ExportSpellOptions } from '../utils/spellFormat';
import { listAccessKeys, protectionFor, type AccessKeyInfo } from '../services/accessKeys';

// What to download, as the caster chose it: the parts to bundle, and what protects it (a
// password, access keys by id).
type DownloadChoice = Omit<ExportSpellOptions, 'protectWith'> & { password?: string; keyIds?: string[] };

// The browser's directory picker (File System Access API: Chrome, Edge), where it has one.
interface WritableFile { write: (data: Blob) => Promise<void>; close: () => Promise<void> }
interface FileHandle { createWritable: () => Promise<WritableFile> }
interface DirectoryHandle { getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandle> }
type DirectoryPicker = (options?: { mode?: 'readwrite'; id?: string }) => Promise<DirectoryHandle>;
const directoryPicker = (): DirectoryPicker | undefined =>
  (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;

// A name not yet taken in the directory: "Title.spell", else "Title (2).spell", and so on --
// a download never overwrites a file that's already there (another spell's, or an earlier
// download's).
const freeName = async (dir: DirectoryHandle, filename: string, taken: Set<string>): Promise<string> => {
  const base = filename.replace(/\.spell$/, '');
  for (let n = 1; ; n++) {
    const name = n === 1 ? filename : `${base} (${n}).spell`;
    if (taken.has(name)) continue;
    try {
      await dir.getFileHandle(name);
    } catch {
      return name;
    }
  }
};

/**
 * Downloads spells as .spell files. One spell: an ordinary download. Several: into a
 * directory the caster picks, where the browser lets one be picked (otherwise one download
 * each). One spell is read and written at a time, so a big grimoire is never all in memory.
 */
export function useDownloadSpells() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const userId = useAppSelector((state) => state.session.userData.id);
  const [isDownloading, setIsDownloading] = useState(false);
  // The access keys a download can be protected with.
  const [keys, setKeys] = useState<AccessKeyInfo[]>([]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listAccessKeys().then(list => { if (!cancelled) setKeys(list); }, () => {});
    return () => { cancelled = true; };
  }, [userId]);

  const download = async (ids: string[], { password, keyIds, ...parts }: DownloadChoice): Promise<void> => {
    if (!userId || ids.length === 0) return;
    let options: ExportSpellOptions;
    try {
      options = { ...parts, protectWith: await protectionFor({ password, keyIds }) };
    } catch (error) {
      console.error('Failed to protect the download:', error);
      dispatch(addApiResponse({ message: t.grimoire.downloadFailed.replace('{n}', String(ids.length)), type: 'error' }));
      return;
    }
    const picker = ids.length > 1 ? directoryPicker() : undefined;
    let dir: DirectoryHandle | null = null;
    if (picker) {
      try {
        dir = await picker({ mode: 'readwrite', id: 'spellcast-grimoire' });
      } catch {
        return; // The caster closed the picker.
      }
    }
    setIsDownloading(true);
    let done = 0;
    let failed = 0;
    const taken = new Set<string>();
    try {
      for (const id of ids) {
        try {
          const { blob, filename } = await exportSpellToBlob(id, userId, options);
          if (dir) {
            const name = await freeName(dir, filename, taken);
            taken.add(name);
            const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            downloadBlob(blob, filename);
          }
          done++;
        } catch (error) {
          console.error('Failed to download spell:', id, error);
          failed++;
        }
      }
    } finally {
      setIsDownloading(false);
    }
    if (failed > 0) {
      dispatch(addApiResponse({ message: t.grimoire.downloadFailed.replace('{n}', String(failed)), type: 'error' }));
    } else if (ids.length > 1) {
      dispatch(addApiResponse({ message: t.grimoire.downloadDone.replace('{n}', String(done)), type: 'success' }));
    }
  };

  return { download, isDownloading, accessKeys: keys };
}
