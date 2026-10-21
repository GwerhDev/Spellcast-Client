import s from './SpellUnlockModal.module.css';
import { useEffect, useState } from 'react';
import { CustomModal } from './CustomModal';
import { LabeledInput } from '../Inputs/LabeledInput';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faLock } from '@fortawesome/free-solid-svg-icons';

interface SpellUnlockModalProps {
  // The protected file's name; null: nothing asked for.
  fileName: string | null;
  // The password given before wasn't this file's.
  wrong: boolean;
  // While the password is being tried.
  busy: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

// A protected .spell's password, asked for to import it.
export const SpellUnlockModal = ({ fileName, wrong, busy, onSubmit, onCancel }: SpellUnlockModalProps) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  // A wrong one is cleared, to type it again.
  useEffect(() => { if (wrong) setPassword(''); }, [wrong, fileName]);
  useEffect(() => { if (fileName === null) setPassword(''); }, [fileName]);

  return (
    <CustomModal compact show={fileName !== null} onClose={() => { if (!busy) onCancel(); }} title={t.protect.unlockTitle}>
      <form
        className={s.container}
        data-testid="spell-unlock-modal"
        onSubmit={(e) => { e.preventDefault(); if (password && !busy) onSubmit(password); }}
      >
        <div className={s.intro}>
          <span className={s.lock}><FontAwesomeIcon icon={faLock} /></span>
          <p className={s.message}>{t.protect.unlockMessage.replace('{name}', fileName ?? '')}</p>
        </div>
        <div className={s.field}>
          <LabeledInput
            id="spell-unlock-secret" htmlFor="spell-unlock-secret" name="spell-unlock-secret" type="password" notSaved
            label={t.protect.passwordField} value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)}
          />
          {wrong && !busy && (
            <p className={s.error} role="alert" data-testid="spell-unlock-wrong">
              <FontAwesomeIcon icon={faCircleExclamation} />
              <span>{t.protect.wrongPassword}</span>
            </p>
          )}
        </div>
        <div className={s.buttons}>
          <SecondaryButton type="button" data-testid="spell-unlock-cancel" onClick={onCancel} disabled={busy}>{t.common.cancel}</SecondaryButton>
          <PrimaryButton type="submit" data-testid="spell-unlock-submit" disabled={!password || busy}>{busy ? `${t.protect.unlock}…` : t.protect.unlock}</PrimaryButton>
        </div>
      </form>
    </CustomModal>
  );
};
