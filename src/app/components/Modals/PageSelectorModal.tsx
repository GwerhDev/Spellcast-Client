import React from 'react';
import s from './PageSelectorModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { goToPage } from '../../../store/pdfReaderSlice';

interface PageSelectorModalProps {
  onClose: () => void;
  show: boolean;
}

export const PageSelectorModal: React.FC<PageSelectorModalProps> = ({
  onClose,
  show,
}) => {
  const dispatch = useDispatch();
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);

  if (!show) {
    return null;
  }

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    onClose();
  };

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select a Page</h3>
        <ul className={s.pageList}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <li
              key={page}
              className={`${s.pageOption} ${currentPage === page ? s.activePage : ''}`}
              onClick={() => handlePageSelection(page)}
            >
              {page}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
