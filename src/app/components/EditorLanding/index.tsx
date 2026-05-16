import s from './index.module.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { resetDocumentState } from '../../../store/documentSlice';
import { useLanguage } from '../../../i18n';

export const EditorLanding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const handleCreateNew = () => {
    dispatch(resetDocumentState());
    navigate('/editor/create');
  };

  return (
    <div className={s.selectContainer}>
      <div className={s.selectInner}>
        <h1 className="featured">{t.editor.tagline}</h1>
        <p>{t.editor.subtitle}</p>
        <div className={s.cards}>
          <div className={s.card} onClick={handleCreateNew}>
            <FontAwesomeIcon icon={faFile} className={s.cardIcon} />
            <span>
              <h3 className={s.cardTitle}>{t.editor.create}</h3>
              <small className={s.description}>{t.editor.createDesc}</small>
            </span>
          </div>
          <div className={s.card} onClick={() => navigate('/editor/select')}>
            <FontAwesomeIcon icon={faPenToSquare} className={s.cardIcon} />
            <span>
              <h3 className={s.cardTitle}>{t.common.edit}</h3>
              <small className={s.description}>{t.editor.editDesc}</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
