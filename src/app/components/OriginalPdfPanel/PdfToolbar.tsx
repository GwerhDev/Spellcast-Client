import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPaperclip, faRotateLeft, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import s from './index.module.css';
import { useLanguage } from '../../../i18n';

// What the original PDF's side of the editor can do, handed down by the editor's page
// (see SpellEditForm): its own toolbar's actions.
export interface PdfPanelOptions {
  // The spell, and whether it kept its original PDF (without one, the panel offers to
  // import it).
  spellId: string;
  hasOriginal: boolean;
  // A PDF being read into the spell: nothing to do here until it's done.
  busy?: boolean;
  onReplacePdf: () => void;
  // Back to the PDF's extraction: the page being edited, or the whole spell.
  onRestorePage?: () => void;
  onRestoreAll?: () => void;
}

interface PdfToolbarProps {
  options: PdfPanelOptions;
  pageNumber: number;
  numPages: number | null;
}

const ToolButton = ({ icon, title, testId, disabled, onClick }: { icon: IconDefinition; title: string; testId: string; disabled?: boolean; onClick?: () => void }) => (
  <button type="button" data-testid={testId} className="magic-text-editor__btn" title={title} aria-label={title} disabled={disabled} onClick={onClick}>
    <FontAwesomeIcon icon={icon} />
  </button>
);

// The PDF's own toolbar, drawn like the text editor's beside it: which page of the PDF this
// is, and replacing the PDF or restoring the spell from it.
export const PdfToolbar = ({ options, pageNumber, numPages }: PdfToolbarProps) => {
  const { t } = useLanguage();
  const { hasOriginal, busy, onReplacePdf, onRestorePage, onRestoreAll } = options;
  return (
    <div data-testid="pdf-toolbar" className={`magic-text-editor__toolbar ${s.toolbar}`}>
      <span className={s.toolbarTitle}>
        <FontAwesomeIcon icon={faFilePdf} />
        {t.spell.originalPdf}
        {hasOriginal && numPages !== null && pageNumber <= numPages && (
          <span data-testid="pdf-toolbar-page" className={s.toolbarPage}>
            {t.spell.pageOf.replace('{n}', String(pageNumber)).replace('{total}', String(numPages))}
          </span>
        )}
      </span>
      <span className={s.toolbarActions}>
        <ToolButton testId="pdf-replace-btn" icon={faPaperclip} title={hasOriginal ? t.spell.replacePdf : t.spell.importPdf} disabled={busy} onClick={onReplacePdf} />
        {onRestorePage && <ToolButton testId="pdf-restore-page-btn" icon={faRotateLeft} title={t.spell.resetPage} disabled={busy} onClick={onRestorePage} />}
        {onRestoreAll && <ToolButton testId="pdf-restore-all-btn" icon={faClockRotateLeft} title={t.spell.resetAllTitle} disabled={busy} onClick={onRestoreAll} />}
      </span>
    </div>
  );
};
