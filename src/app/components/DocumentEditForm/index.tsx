import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, updateDocumentContent } from '../../../db';
import { Spinner } from '../Spinner';
import { PageList } from '../DocumentCreateForm/PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import { faArrowLeft, faCloudUpload, faSave } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const DocumentEditForm: React.FC = () => {
  const { id, page } = useParams<{ id: string, page?: string }>();
  const navigate = useNavigate();
  const { userData, logged } = useAppSelector((state) => state.session);

  const [documentTitle, setDocumentTitle] = useState('');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState(Number(page) - 1 || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !logged) return;
      try {
        const doc = await getDocumentById(id, userData.id);
        if (!doc) { setError('Document not found.'); return; }
        setDocumentTitle(doc.title);
        const pages: JSONContent[] = doc.pagesContent
          ? JSON.parse(doc.pagesContent)
          : [emptyContent];
        setPagesContent(pages.length > 0 ? pages : [emptyContent]);
      } catch {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  const handlePageClick = (index: number) => setEditingPageIndex(index);

  const handlePageDelete = (index: number) => {
    const updated = pagesContent.filter((_, i) => i !== index);
    setPagesContent(updated);
    setEditingPageIndex(Math.min(Number(editingPageIndex), updated.length - 1));
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
    setEditingPageIndex(pagesContent.length);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updated = [...pagesContent];
    updated[Number(editingPageIndex)] = newContent;
    setPagesContent(updated);
  };

  const handleSave = async () => {
    if (!documentTitle || pagesContent.length === 0) {
      alert('Please provide a title and at least one page.');
      return;
    }
    if (!logged || !id) return;
    const docId = id;

    setIsSaving(true);
    try {
      await updateDocumentContent(docId, userData.id!, {
        title: documentTitle,
        pagesContent: JSON.stringify(pagesContent),
      });

      navigate(`/document/${docId}`);
    } catch (err) {
      console.error('Failed to save document:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={s.container}><Spinner isLoading /></div>;
  if (error) return <div className={s.container}><div className={s.error}>{error}</div></div>;

  return (
    <div className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' onClick={() => navigate(-1)} />
        <span className={s.titleContainer}>
          <input
            className={s.documentTitle}
            type="text"
            placeholder="Document title..."
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
          />
        </span>

        <IconButton disabled={isSaving} icon={faSave} variant='transparent' onClick={handleSave} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' onClick={handleSave} />
      </div>

      <div className={s.editorContainer}>
        <DocumentEditor
          pageNumber={Number(editingPageIndex) + 1}
          pageContent={pagesContent[Number(editingPageIndex)]}
          onPageContentChange={handlePageContentChange}
        />
        <div className={s.pagesContainer}>
          <PageList
            pages={pagesContent.map(() => '')}
            currentPage={Number(editingPageIndex)}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
          />
        </div>
      </div>
    </div>

  );
};
