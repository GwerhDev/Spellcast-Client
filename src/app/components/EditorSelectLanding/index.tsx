import s from './index.module.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { getDocumentsFromDB } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { Document } from 'src/interfaces';
import { EditorPickerCard } from '../Cards/EditorPickerCard';
import { IconButton } from '../Buttons/IconButton';
import { Spinner } from '../Spinner';

export const EditorSelectLanding = () => {
  const navigate = useNavigate();
  const { userData } = useAppSelector((state) => state.session);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDocumentsFromDB(userData.id)
      .then((docs) =>
        setDocuments(docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      )
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userData.id]);

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <IconButton icon={faArrowLeft} variant='transparent' onClick={() => navigate('/editor')} />
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
};
