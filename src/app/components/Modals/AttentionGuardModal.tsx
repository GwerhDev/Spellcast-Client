import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { NumberStepper } from '../Inputs/NumberStepper';
import { ToggleRow } from '../Inputs/ToggleRow';
import { useLanguage } from '../../../i18n';
import { RootState } from '../../../store';
import { setAttentionGuardInterval, setAttentionGuardEnabled } from '../../../store/pdfReaderSlice';
import s from './AttentionGuardModal.module.css';

interface AttentionGuardModalProps {
  show: boolean;
  onContinue: () => void;
}

export const AttentionGuardModal: React.FC<AttentionGuardModalProps> = ({ show, onContinue }) => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const attentionGuardEnabled = useSelector((state: RootState) => state.pdfReader.attentionGuardEnabled);
  const attentionGuardInterval = useSelector((state: RootState) => state.pdfReader.attentionGuardInterval);

  const handleInterval = (value: number) => {
    const clamped = Math.min(30, Math.max(1, value));
    dispatch(setAttentionGuardInterval(clamped));
    localStorage.setItem('reader:attentionGuardInterval', String(clamped));
  };

  const handleToggle = (value: boolean) => {
    dispatch(setAttentionGuardEnabled(value));
    localStorage.setItem('reader:attentionGuard', String(value));
  };

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  return (
    <CustomModal show={show} onClose={onContinue} title={t.reader.attentionGuardModalTitle} compact>
      <div className={s.content}>
        <div className={s.centered}>
          <div className={s.iconWrap}>
            <FontAwesomeIcon icon={faEye} className={s.icon} />
          </div>
          <p className={s.body}>{t.reader.attentionGuardModalBody}</p>
        </div>
        <ToggleRow
          label={t.reader.attentionGuard}
          description={t.reader.attentionGuardDesc}
          value={attentionGuardEnabled}
          onChange={handleToggle}
        >
          {attentionGuardEnabled && (
            <>
              <span className={s.intervalLabel}>{t.reader.attentionGuardInterval}</span>
              <NumberStepper
                value={attentionGuardInterval}
                min={1}
                max={30}
                suffix={t.reader.attentionGuardIntervalMin}
                onChange={handleInterval}
              />
            </>
          )}
        </ToggleRow>
        <div className={s.centered}>
          <PrimaryButton text={t.reader.attentionGuardCta} onClick={onContinue} />
        </div>
      </div>
    </CustomModal>
  );
};
