import s from './index.module.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { resetDocumentState } from '../../../store/documentSlice';

export const EditorLanding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleCreateNew = () => {
    dispatch(resetDocumentState());
    navigate('/editor/create');
  };

  return (
    <div className={s.selectContainer}>
      <div className={s.selectInner}>
        <h1>Shape your words</h1>
        <p>Start from scratch or pick up where you left off</p>
        <div className={s.cards}>
          <div className={s.card} onClick={handleCreateNew}>
            <FontAwesomeIcon icon={faFile} className={s.cardIcon} />
            <h3 className={s.cardTitle}>Create new document</h3>
          </div>
          <div className={s.card} onClick={() => navigate('/editor/select')}>
            <FontAwesomeIcon icon={faPenToSquare} className={s.cardIcon} />
            <h3 className={s.cardTitle}>Edit a document</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
