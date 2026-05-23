import s from '../../components/DocumentReader/ReaderSettingsPanel.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { setAutoSave, setShowEditorSettings } from '../../../store/editorSlice';
import { useLanguage } from '../../../i18n';

export const EditorSettingsPanel = () => {
  const dispatch = useDispatch();
  const { autoSave } = useSelector((state: RootState) => state.editor);
  const { t } = useLanguage();

  const handleAutoSave = (value: boolean) => {
    dispatch(setAutoSave(value));
    localStorage.setItem('editor:autoSave', String(value));
  };

  return (
    <div data-testid="editor-settings-panel" className={s.outerContainer} style={{ width: '300px' }}>
      <div className={s.container}>
        <div className={s.menuContainer}>
          <div className={s.header}>
            <span className={s.title}>{t.editorSettings.title}</span>
            <FontAwesomeIcon
              data-testid="editor-settings-close"
              icon={faXmark}
              className={s.closeButton}
              onClick={() => dispatch(setShowEditorSettings(false))}
            />
          </div>
          <ul className={s.optionList}>
            <li
              data-testid="editor-settings-autosave"
              className={autoSave ? s.optionActive : s.option}
              onClick={() => handleAutoSave(true)}
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
              {t.editorSettings.autoSave}
            </li>
            <li
              data-testid="editor-settings-manualsave"
              className={!autoSave ? s.optionActive : s.option}
              onClick={() => handleAutoSave(false)}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
              {t.editorSettings.manualSave}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
