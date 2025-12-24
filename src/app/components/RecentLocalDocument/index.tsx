import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB } from '../../../db';
import { Link } from 'react-router-dom';
import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';

interface LocalDocument {
  id: string;
  title: string;
  createdAt: Date;
}

export const RecentLocalDocument: React.FC = () => {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await getDocumentsFromDB();
        const sortedDocs = docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(sortedDocs.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch local documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (isLoading) {
    return <p>Loading recent documents...</p>;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className={s.container}>
      <h2 className={s.title}>Recent Local Documents</h2>
      <div className={s.listContainer}>
        {documents.map((doc) => (
          <Link key={doc.id} to={`/document/local/${doc.id}`} className={s.docLink}>
            <div className={s.docInfo}>
              <FontAwesomeIcon icon={faFilePdf} size="2x" />
              <div>
                <span className={s.docTitle}>{doc.title}</span>
                <small className={s.docDate}>{new Date(doc.createdAt).toLocaleString()}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
