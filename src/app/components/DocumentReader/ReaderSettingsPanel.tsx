import { useRef, useEffect } from 'react';
import s from './ReaderSettingsPanel.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsLeftRight, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth } from '../../../store/pdfReaderSlice';

export const ReaderSettingsPanel = () => {
  const dispatch = useDispatch();
  const { fitToWidth } = useSelector((state: RootState) => state.pdfReader);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dispatch(setShowReaderSettings(false));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
    localStorage.setItem('reader:fitToWidth', String(value));
  };

  return (
    <div className={s.outerContainer} ref={containerRef}>
    <div className={s.container}>
      <div className={s.menuContainer}>
        <div className={s.header}>
          <span className={s.title}>Display</span>
        </div>
        <ul className={s.optionList}>
          <li
            className={fitToWidth ? s.optionActive : s.option}
            onClick={() => handleFitToWidth(true)}
          >
            <FontAwesomeIcon icon={faArrowsLeftRight} />
            Fit to width
          </li>
          <li
            className={!fitToWidth ? s.optionActive : s.option}
            onClick={() => handleFitToWidth(false)}
          >
            <FontAwesomeIcon icon={faFilePdf} />
            View as PDF
          </li>
        </ul>
      </div>
    </div>
    </div>
  );
};
