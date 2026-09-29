import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { invalidateSpellList } from '../store/spellReaderSlice';
import { useLanguage } from '../i18n';
import { importSpellFromFile } from '../utils/spellFormat';

/**
 * Shared "import a .spell file" flow (TCORE-78) — hydrates a new Spell (+ any bundled
 * audio) into IndexedDB, then invalidates the spell list so it shows up without a manual
 * refresh. Lives in src/hooks/ for the same layering reason as useSpellExport.
 *
 * Exposes a plain `importFile(file)` rather than owning a hidden `<input>` itself: its
 * callers (ImportOption, Start's Read tab) each have their own file input/dropzone and just
 * need to route a `.spell` File here.
 */
export function useSpellImport() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const [isImporting, setIsImporting] = useState(false);

  // Resolves to the new spell's id (null if it couldn't be imported), so a caller can go on
  // to use it -- e.g. start reading it right away.
  const importFile = async (file: File): Promise<string | null> => {
    if (!userData.id) return null;

    setIsImporting(true);
    try {
      const spellId = await importSpellFromFile(file, userData.id);
      dispatch(invalidateSpellList());
      dispatch(addApiResponse({ message: t.spell.importSuccess.replace('{title}', file.name.replace(/\.spell$/i, '')), type: 'success' }));
      return spellId;
    } catch (error) {
      console.error('Failed to import .spell file:', error);
      dispatch(addApiResponse({ message: t.spell.importError, type: 'error' }));
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  return { importFile, isImporting };
}
