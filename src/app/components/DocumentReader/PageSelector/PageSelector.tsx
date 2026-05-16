import s from './PageSelector.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { TertiaryButton } from '../../Buttons/TertiaryButton';
import { setShowPageSelector } from 'store/pdfReaderSlice';
import { useLanguage } from '../../../../i18n';

interface PageSelectorProps {
  onClick?: () => void;
}

export const PageSelector: React.FC<PageSelectorProps> = () => {
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const handleClick = () => {
    dispatch(setShowPageSelector(true));
  };

  return (
    <div className={s.pageSelectorContainer}>
      <TertiaryButton onClick={handleClick}>
        {`${t.document.page} ${currentPage} ${t.document.of} ${totalPages}`}
      </TertiaryButton>
    </div>
  );
};
