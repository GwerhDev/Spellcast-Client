import s from './index.module.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faPenToSquare, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { resetDocumentState } from '../../../store/documentSlice';
import { getDocumentsFromDB } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { Document } from 'src/interfaces';
import { EditorPickerCard } from '../Cards/EditorPickerCard';
import { IconButton } from '../Buttons/IconButton';
import { Spinner } from '../Spinner';

export const EditorLanding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useAppSelector((state) => state.session);

  const [step, setStep] = useState<'select' | 'edit-list'>('select');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (step !== 'edit-list') return;
    setIsLoading(true);
    getDocumentsFromDB(userData.id)
      .then((docs) => setDocuments(docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [step, userData.id]);

  const handleCreateNew = () => {
    dispatch(resetDocumentState());
    navigate('/editor/create');
  };

  if (step === 'edit-list') {
    return (
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <IconButton icon={faArrowLeft} variant='transparent' onClick={() => setStep('select')} />
          <h2 className={s.panelTitle}>Select a document</h2>
        </div>
        <div className={s.panelBody}>
          {isLoading ? (
            <Spinner isLoading />
          ) : documents.length === 0 ? (
            <p className={s.empty}>No local documents found.</p>
          ) : (
            <div className={s.docGrid}>
              {documents.map((doc) => (
                <EditorPickerCard
                  key={doc.id}
                  doc={doc}
                  onClick={() => navigate(`/editor/${doc.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <div className={s.card} onClick={() => setStep('edit-list')}>
            <FontAwesomeIcon icon={faPenToSquare} className={s.cardIcon} />
            <h3 className={s.cardTitle}>Edit a document</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
