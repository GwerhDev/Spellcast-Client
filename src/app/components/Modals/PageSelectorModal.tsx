import React, { useState } from 'react';
import s from './PageSelectorModal.module.css';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { goToPage, setShowPageSelector } from '../../../store/pdfReaderSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CustomModal } from './CustomModal';

interface PageSelectorModalProps {
  onClose?: () => void;
  show?: boolean;
}

export const PageSelectorModal: React.FC<PageSelectorModalProps> = () => {
  const dispatch = useDispatch();
  const { currentPage, totalPages, showPageSelector } = useSelector((state: RootState) => state.pdfReader);
  const [searchTerm, setSearchTerm] = useState('');

  if (!showPageSelector) {
    return null;
  }

  const onClose = () => {
    dispatch(setShowPageSelector(false));
  };

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    dispatch(setShowPageSelector(false));
  };

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = searchTerm
    ? allPages.filter(page => page.toString().includes(searchTerm))
    : allPages;

  return (
    <CustomModal title="Select a Page" show={showPageSelector} onClose={onClose}>
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
    </CustomModal>
  );
};