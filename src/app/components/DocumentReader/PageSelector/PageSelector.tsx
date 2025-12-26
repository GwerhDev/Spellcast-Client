import s from './PageSelector.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { PrimaryButton } from '../../Buttons/PrimaryButton';
import { setShowPageSelector } from 'store/pdfReaderSlice';

interface PageSelectorProps {
  onClick?: () => void;
}

export const PageSelector: React.FC<PageSelectorProps> = () => {
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);
  const dispatch = useDispatch();

  const handleClick = () => {
    dispatch(setShowPageSelector(true));
  };

  return (
    <div className={s.pageSelectorContainer}>
      <PrimaryButton onClick={handleClick}>
        {`Page ${currentPage} of ${totalPages}`}
      </PrimaryButton>
    </div>
  );
};
