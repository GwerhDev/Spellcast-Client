import s from '../DocumentReader/ReaderSettingsPanel.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { setAutoSave, setShowEditorSettings } from '../../../store/editorSlice';

export const EditorSettingsPanel = () => {
  const dispatch = useDispatch();
  const { autoSave } = useSelector((state: RootState) => state.editor);

  const handleAutoSave = (value: boolean) => {
    dispatch(setAutoSave(value));
    localStorage.setItem('editor:autoSave', String(value));
  };

  return (
    <div className={s.outerContainer} style={{ width: '300px' }}>
      <div className={s.container}>
        <div className={s.menuContainer}>
          <div className={s.header}>
            <span className={s.title}>Editor</span>
            <FontAwesomeIcon icon={faXmark} className={s.closeButton} onClick={() => dispatch(setShowEditorSettings(false))} />
          </div>
          <ul className={s.optionList}>
            <li
              className={autoSave ? s.optionActive : s.option}
              onClick={() => handleAutoSave(true)}
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
              Auto save
            </li>
            <li
              className={!autoSave ? s.optionActive : s.option}
              onClick={() => handleAutoSave(false)}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
              Manual save
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
