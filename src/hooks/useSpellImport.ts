import { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { invalidateSpellList } from '../store/pdfReaderSlice';
import { useLanguage } from '../i18n';
import { importSpellFromFile } from '../utils/spellFormat';

/**
 * Shared "import a .spell file" flow (TCORE-78) — hides a file input, hydrates a new
 * Spell (+ any bundled audio) into IndexedDB on selection, then invalidates the spell
 * list so it shows up without a manual refresh. Lives in src/hooks/ for the same
 * layering reason as useSpellExport.
 */
export function useSpellImport() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const triggerImport = () => inputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !userData.id) return;

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

  return { inputRef, triggerImport, handleFileSelected, isImporting };
}
