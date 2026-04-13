import s from './ReaderSettingsPanel.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth } from '../../../store/pdfReaderSlice';

export const ReaderSettingsPanel = () => {
  const dispatch = useDispatch();
  const { fitToWidth } = useSelector((state: RootState) => state.pdfReader);

  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
    localStorage.setItem('reader:fitToWidth', String(value));
  };

  return (
    <div className={s.outerContainer}>
    <div className={s.container}>
      <div className={s.menuContainer}>
        <div className={s.header}>
          <span className={s.title}>Display</span>
          <button className={s.closeButton} onClick={() => dispatch(setShowReaderSettings(false))}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <ul className={s.optionList}>
          <li
            className={fitToWidth ? s.optionActive : s.option}
            onClick={() => handleFitToWidth(true)}
          >
            Fit to width
          </li>
          <li
            className={!fitToWidth ? s.optionActive : s.option}
            onClick={() => handleFitToWidth(false)}
          >
            View as PDF
          </li>
        </ul>
      </div>
    </div>
    </div>
  );
};
