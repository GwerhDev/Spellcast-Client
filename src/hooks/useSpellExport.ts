import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { useLanguage } from '../i18n';
import { exportSpellToBlob, downloadBlob, type ExportSpellOptions } from '../utils/spellFormat';

interface ExportTarget {
  id: string;
  title: string;
}

/**
 * Shared "export a Spell to .spell" flow (TCORE-78) — opens a confirmation modal with
 * the source/audio toggles, then does the actual DB read + ZIP assembly + download on
 * confirm. Lives in src/hooks/ (not src/app/components/) so it can touch Redux/IndexedDB
 * per the app's layer rules, while the modal it drives stays a presentational Layer 4
 * component that just reports the user's choice back via onExport.
 */
export function useSpellExport() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const [target, setTarget] = useState<ExportTarget | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const openExportModal = (spell: ExportTarget) => setTarget(spell);
  const closeExportModal = () => { if (!isExporting) setTarget(null); };

  const handleExport = async (options: ExportSpellOptions) => {
    if (!target || !userData.id) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await exportSpellToBlob(target.id, userData.id, options);
      downloadBlob(blob, filename);
      setTarget(null);
    } catch (error) {
      console.error('Failed to export spell:', error);
      dispatch(addApiResponse({ message: t.spell.exportError, type: 'error' }));
    } finally {
      setIsExporting(false);
    }
  };

  return { exportTarget: target, openExportModal, closeExportModal, handleExport, isExporting };
}
