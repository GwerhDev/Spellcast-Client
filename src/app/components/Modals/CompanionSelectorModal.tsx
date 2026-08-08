import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCat, faBan, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { CustomModal } from './CustomModal';
import { RootState } from '../../../store';
import { setActiveCompanion } from '../../../store/userLibrarySlice';
import { companions } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './CompanionSelectorModal.module.css';

interface CompanionSelectorModalProps {
  show: boolean;
  onClose: () => void;
}

export const CompanionSelectorModal: React.FC<CompanionSelectorModalProps> = ({ show, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { unlockedIds, activeCompanionId } = useSelector((state: RootState) => state.userLibrary);
  const unlockedCompanions = companions.filter(c => unlockedIds.includes(c.id));

  return (
    <CustomModal show={show} onClose={onClose} title={t.reader.companions} compact>
      <ul className={s.list}>
        <li
          className={`${s.option} ${!activeCompanionId ? s.optionActive : ''}`}
          onClick={() => dispatch(setActiveCompanion(null))}
        >
          <span className={s.iconWrap}>
            <FontAwesomeIcon icon={faBan} />
          </span>
          <span className={s.name}>{t.reader.noCompanion}</span>
          {!activeCompanionId && <FontAwesomeIcon icon={faCheck} className={s.checkBadge} />}
        </li>
        {unlockedCompanions.map(companion => {
          const isActive = activeCompanionId === companion.id;
          return (
            <li
              key={companion.id}
              className={`${s.option} ${isActive ? s.optionActive : ''}`}
              onClick={() => dispatch(setActiveCompanion(companion.id))}
            >
              <span className={s.iconWrap} style={{ background: companion.thumbnail }}>
                <FontAwesomeIcon icon={faCat} />
              </span>
              <span className={s.name}>{companion.name}</span>
              {isActive && <FontAwesomeIcon icon={faCheck} className={s.checkBadge} />}
            </li>
          );
        })}
        {unlockedCompanions.length === 0 && (
          <p className={s.empty}>{t.reader.noCompanionsUnlocked}</p>
        )}
      </ul>
    </CustomModal>
  );
};
