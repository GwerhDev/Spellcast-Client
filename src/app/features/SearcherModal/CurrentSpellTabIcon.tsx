import React from 'react';
import s from '../../components/Modals/SearcherModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SPELL_ICON } from '../../../config/consts';
import { useAppSelector } from '../../../store/hooks';
import { useSpellCoverUrl } from '../../../hooks/useSpellCoverUrl';

// The open Spell's tab: its cover (or a scroll, while it has none).
export const CurrentSpellTabIcon: React.FC = () => {
  const spellId = useAppSelector(state => state.spellReader.spellId);
  const { userData } = useAppSelector(state => state.session);
  const coverUrl = useSpellCoverUrl(spellId, userData.id);
  return coverUrl
    ? <img src={coverUrl} alt="" className={s.tabCover} data-testid="current-spell-tab-cover" />
    : <FontAwesomeIcon icon={SPELL_ICON} />;
};
