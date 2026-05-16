import s from './ReaderSettingsPanel.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsLeftRight, faFilePdf, faXmark } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth } from '../../../store/pdfReaderSlice';
import { useLanguage } from '../../../i18n';

export const ReaderSettingsPanel = () => {
  const dispatch = useDispatch();
  const { fitToWidth } = useSelector((state: RootState) => state.pdfReader);
  const { t } = useLanguage();

  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
    localStorage.setItem('reader:fitToWidth', String(value));
  };

  return (
    <div className={s.outerContainer}>
      <div className={s.container}>
        <div className={s.menuContainer}>
          <div className={s.header}>
            <span className={s.title}>{t.reader.displayTab}</span>
            <FontAwesomeIcon icon={faXmark} className={s.closeButton} onClick={() => dispatch(setShowReaderSettings(false))} />
          </div>
          <ul className={s.optionList}>
            <li
              className={fitToWidth ? s.optionActive : s.option}
              onClick={() => handleFitToWidth(true)}
            >
              <FontAwesomeIcon icon={faArrowsLeftRight} />
              {t.reader.fitToWidth}
            </li>
            <li
              className={!fitToWidth ? s.optionActive : s.option}
              onClick={() => handleFitToWidth(false)}
            >
              <FontAwesomeIcon icon={faFilePdf} />
              {t.reader.viewAsPdf}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
