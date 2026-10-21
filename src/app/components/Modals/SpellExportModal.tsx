import s from './SpellExportModal.module.css';
import React, { useState } from 'react';
import { TabModal } from './TabModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { ToggleRow } from '../Inputs/ToggleRow';
import { LabeledInput } from '../Inputs/LabeledInput';
import { IconButton } from '../Buttons/IconButton';
import { faScroll, faCheck, faCopy, faLock, faTriangleExclamation, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { generatePassword } from '../../../utils/passwordGenerator';
import { useLanguage } from '../../../i18n';

export interface SpellExportChoice {
  includeSource: boolean;
  includeAudio: boolean;
  // Protected with this password, and these access keys (by id); none: free, as always.
  password?: string;
  keyIds: string[];
}

interface SpellExportModalProps {
  show: boolean;
  title: string;
  isExporting: boolean;
  onClose: () => void;
  onExport: (choice: SpellExportChoice) => void;
  // The caster's access keys to protect it with.
  accessKeys?: { id: string; name: string }[];
  // For more than one spell (a download of several): its own heading and button, instead of
  // "Export {title}" and "Export".
  heading?: string;
  confirmText?: string;
}

export const SpellExportModal: React.FC<SpellExportModalProps> = ({ show, title, isExporting, onClose, onExport, heading, confirmText, accessKeys = [] }) => {
  const { t } = useLanguage();
  const [includeSource, setIncludeSource] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(false);
  // Protection: a password (asked twice: a lost one can't be recovered), access keys.
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [keyIds, setKeyIds] = useState<string[]>([]);
  // The password copied just now (a generated one, to be kept somewhere).
  const [copied, setCopied] = useState(false);
  const generate = () => {
    const made = generatePassword();
    setPassword(made);
    setConfirmation(made);
    setCopied(false);
  };
  const copy = () => {
    navigator.clipboard?.writeText(password).then(() => setCopied(true), () => {});
  };
  const mismatch = withPassword && confirmation !== '' && confirmation !== password;
  const passwordReady = !withPassword || (password !== '' && confirmation === password);

  if (!show) return null;

  // The download's buttons, under the tabs.
  const actions = (
    <div className={s.buttons} data-testid="spell-export-modal">
      <SecondaryButton data-testid="spell-export-cancel-btn" onClick={onClose} disabled={isExporting}>
        {t.common.cancel}
      </SecondaryButton>
      <PrimaryButton
        data-testid="spell-export-confirm-btn"
        onClick={() => onExport({ includeSource, includeAudio, password: withPassword ? password : undefined, keyIds })}
        disabled={isExporting || !passwordReady}
      >
        {isExporting ? `${confirmText ?? t.spell.exportButton}…` : (confirmText ?? t.spell.exportButton)}
      </PrimaryButton>
    </div>
  );

  // What goes in the file, and what protects it: a tab each, kept while switching.
  const content = (
    <div className={s.container}>
      <div className={s.toggles}>
        <ToggleRow
          label={t.spell.exportIncludeSource}
          description={t.spell.exportIncludeSourceDesc}
          value={includeSource}
          onChange={setIncludeSource}
        />
        <ToggleRow
          label={t.spell.exportIncludeAudio}
          description={t.spell.exportIncludeAudioDesc}
          value={includeAudio}
          onChange={setIncludeAudio}
        />
      </div>
    </div>
  );

  const protection = (
    <div className={s.container}>
      <div className={s.toggles} data-testid="spell-export-protection">
        <ToggleRow testId="spell-export-password-toggle" label={t.protect.password} description={t.protect.passwordDesc} value={withPassword} onChange={setWithPassword}>
          {withPassword && (
            <div className={s.password}>
              <div className={s.fields}>
                <LabeledInput
                  id="spell-export-secret" htmlFor="spell-export-secret" name="spell-export-secret" type="password" notSaved
                  label={t.protect.passwordField} value={password} onChange={(e) => { setPassword(e.target.value); setCopied(false); }}
                />
                <LabeledInput
                  id="spell-export-secret-confirm" htmlFor="spell-export-secret-confirm" name="spell-export-secret-confirm" type="password" notSaved
                  label={t.protect.confirmField} value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              <div className={s.passwordTools}>
                <span className={s.error} data-testid={mismatch ? 'spell-export-password-mismatch' : undefined}>{mismatch ? t.protect.mismatch : ''}</span>
                <IconButton
                  className={s.tool} data-testid="spell-export-password-copy" icon={copied ? faCheck : faCopy}
                  title={copied ? t.protect.copied : t.protect.copy} disabled={!password} onClick={copy}
                />
                <IconButton
                  className={`${s.tool} ${s.toolText}`} data-testid="spell-export-password-generate" icon={faWandMagicSparkles}
                  text={t.protect.generate} onClick={generate}
                />
              </div>
              <p className={s.warning}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>{t.protect.warning}</span>
              </p>
            </div>
          )}
        </ToggleRow>
        {/* Access keys: shown disabled until the caster's account keeps them. */}
        {accessKeys.length === 0 && (
          <ToggleRow
            soon
            soonLabel={t.start.soon}
            testId="spell-export-key-soon"
            label={t.protect.accessKey}
            description={t.protect.keyDesc}
            value={false}
            onChange={() => {}}
          />
        )}
        {accessKeys.map(key => (
          <ToggleRow
            key={key.id}
            testId={`spell-export-key-${key.id}`}
            label={t.protect.namedKey.replace('{name}', key.name)}
            description={t.protect.keyDesc}
            value={keyIds.includes(key.id)}
            onChange={(on) => setKeyIds(ids => (on ? [...ids, key.id] : ids.filter(id => id !== key.id)))}
          />
        ))}
      </div>
    </div>
  );

  return (
    <TabModal
      show={show}
      onClose={onClose}
      title={heading ?? t.spell.exportTitle.replace('{title}', title)}
      tabs={[
        { id: 'content', icon: faScroll, label: t.spell.exportContentTab, content },
        { id: 'protection', icon: faLock, label: t.protect.title, content: protection },
      ]}
      footer={actions}
    />
  );
};
