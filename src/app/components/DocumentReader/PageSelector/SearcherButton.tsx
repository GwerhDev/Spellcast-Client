import s from './SearcherButton.module.css';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { TertiaryButton } from '../../Buttons/TertiaryButton';
import { setShowSearcher } from 'store/pdfReaderSlice';
import { useLanguage } from '../../../../i18n';

export const SearcherButton: React.FC = () => {
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);
  const dispatch = useDispatch();
  const { t } = useLanguage();

  return (
    <div className={s.searcherButtonContainer}>
      <TertiaryButton onClick={() => dispatch(setShowSearcher(true))}>
        {`${t.document.page} ${currentPage} ${t.document.of} ${totalPages}`}
      </TertiaryButton>
    </div>
  );
};
