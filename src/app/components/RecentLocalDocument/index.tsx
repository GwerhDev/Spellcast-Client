import React, { useEffect, useState } from 'react';
import { getDocumentsFromDB } from '../../../db';
import { Link } from 'react-router-dom';
import s from './index.module.css';

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
      <ul className={s.list}>
        {documents.map((doc) => (
          <li key={doc.id} className={s.listItem}>
            <Link to={`/document/local/${doc.id}`} className={s.link}>
              <span className={s.docTitle}>{doc.title}</span>
              <span className={s.docDate}>{new Date(doc.createdAt).toLocaleDateString()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
