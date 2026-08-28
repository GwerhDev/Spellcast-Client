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
 * Exposes a plain `importFile(file)` rather than owning a hidden `<input>` itself: its one
 * caller, ImportOption, already has its own file input/dropzone (shared with PDF import,
 * TCORE-90-adjacent unification) and just needs to route a `.spell` File here.
 */
export function useSpellImport() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const [isImporting, setIsImporting] = useState(false);

  const importFile = async (file: File): Promise<void> => {
    if (!userData.id) return;

    setIsImporting(true);
    try {
      await importSpellFromFile(file, userData.id);
      dispatch(invalidateSpellList());
      dispatch(addApiResponse({ message: t.spell.importSuccess.replace('{title}', file.name.replace(/\.spell$/i, '')), type: 'success' }));
    } catch (error) {
      console.error('Failed to import .spell file:', error);
      dispatch(addApiResponse({ message: t.spell.importError, type: 'error' }));
    } finally {
      setIsImporting(false);
    }
  };

  return { importFile, isImporting };
}
