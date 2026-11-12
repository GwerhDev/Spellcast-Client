import { faFilePdf, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './index.module.css';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { useLanguage } from '../../../i18n';

interface OriginalPdfEmptyProps {
  busy?: boolean;
  onImport: () => void;
  className?: string;
}

// What the PDF's side shows when the spell has no original PDF: the same offer to import
// one, whether that side sits beside the editor or on the back of the turned-over sheet.
export const OriginalPdfEmpty = ({ busy, onImport, className }: OriginalPdfEmptyProps) => {
  const { t } = useLanguage();
  return (
    <div data-testid="original-pdf-none" className={[s.empty, className].filter(Boolean).join(' ')}>
      <FontAwesomeIcon icon={faFilePdf} className={s.icon} />
      <p>{t.spell.noOriginalPdf}</p>
      <PrimaryButton data-testid="original-pdf-import-btn" className={s.action} icon={faPaperclip} disabled={busy} onClick={onImport}>
        {t.spell.importPdf}
      </PrimaryButton>
    </div>
  );
};
