import s from './PageSelector.module.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { PrimaryButton } from '../../Buttons/PrimaryButton';

interface PageSelectorProps {
  onClick: () => void;
}

export const PageSelector: React.FC<PageSelectorProps> = ({ onClick }) => {
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);

  return (
    <div className={s.pageSelectorContainer}>
      <PrimaryButton onClick={onClick}>
        {`Page ${currentPage} of ${totalPages}`}
      </PrimaryButton>
    </div>
  );
};
