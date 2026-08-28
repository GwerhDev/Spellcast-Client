import s from '../../components/SpellReader/Searcher/SearcherButton.module.css';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { TertiaryButton } from '../../components/Buttons/TertiaryButton';
import { setShowSearcher } from '../../../store/spellReaderSlice';
import { useLanguage } from '../../../i18n';

export const SearcherButton: React.FC = () => {
  const { currentPage, totalPages } = useSelector((state: RootState) => state.spellReader);
  const dispatch = useDispatch();
  const { t } = useLanguage();

  return (
    <div data-testid="searcher-button" className={s.searcherButtonContainer}>
      <TertiaryButton icon={faMagnifyingGlass} onClick={() => dispatch(setShowSearcher(true))}>
        {`${t.spell.page} ${currentPage} ${t.spell.of} ${totalPages}`}
      </TertiaryButton>
    </div>
  );
};
