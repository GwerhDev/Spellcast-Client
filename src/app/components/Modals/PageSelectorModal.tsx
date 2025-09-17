import React, { useState } from 'react';
import s from './PageSelectorModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faNewspaper, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { goToPage } from '../../../store/pdfReaderSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
  const [searchTerm, setSearchTerm] = useState('');

  if (!show) {
    return null;
  }

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    onClose();
  };

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = searchTerm
    ? allPages.filter(page => page.toString().includes(searchTerm))
    : allPages;

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select a Page</h3>
        <input
          type="text"
          placeholder="Search for a page..."
          className={s.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className={s.pageList}>
          {filteredPages.map((page) => (
            <li
              key={page}
              className={`${s.pageOption} ${currentPage === page ? s.activePage : ''}`}
              onClick={() => handlePageSelection(page)}
            >
              <FontAwesomeIcon icon={faNewspaper} />
              {page}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};