import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { goToPage } from '../../../../../store/pdfReaderSlice';
import s from './PageSelector.module.css';

export const PageSelector = () => {
  const dispatch = useDispatch();
  const { currentPage, totalPages } = useSelector((state: RootState) => state.pdfReader);

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const page = Number(e.target.value);
    if (!isNaN(page)) {
      dispatch(goToPage(page));
    }
  };

  return (
    <div className={s.pageSelectorContainer}>
      <span>Page</span>
      <select
        value={currentPage}
        onChange={handlePageChange}
        className={s.pageSelect}
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <option key={page} value={page}>
            {page}
          </option>
        ))}
      </select>
      <span className={s.totalPages}>of {totalPages}</span>
    </div>
  );
};