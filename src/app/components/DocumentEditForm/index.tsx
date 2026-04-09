import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, updateDocumentContent } from '../../../db';
import { Spinner } from '../Spinner';
import { PageList } from '../DocumentCreateForm/PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import { faArrowLeft, faCloud, faSave } from '@fortawesome/free-solid-svg-icons';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { IconButton } from '../Buttons/IconButton';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const DocumentEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData, logged } = useAppSelector((state) => state.session);

  const [documentTitle, setDocumentTitle] = useState('');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState(0);
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
    setEditingPageIndex(Math.min(editingPageIndex, updated.length - 1));
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
    setEditingPageIndex(pagesContent.length);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updated = [...pagesContent];
    updated[editingPageIndex] = newContent;
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

      navigate(`/document/${docId}/reader`);
    } catch (err) {
      console.error('Failed to save document:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Spinner isLoading />;
  if (error) return <div className={s.error}>{error}</div>;

  return (
    <div className={s.container}>
      <IconButton icon={faArrowLeft} variant='transparent' onClick={() => navigate(`/document/${id}/reader`)} />
      <input
        className={s.documentTitle}
        type="text"
        placeholder="Document title..."
        value={documentTitle}
        onChange={(e) => setDocumentTitle(e.target.value)}
      />

      <div className={s.editorContainer}>
        <DocumentEditor
          pageNumber={editingPageIndex + 1}
          pageContent={pagesContent[editingPageIndex]}
          onPageContentChange={handlePageContentChange}
        />
        <div className={s.pagesContainer}>
          <PageList
            pages={pagesContent.map(() => '')}
            currentPage={editingPageIndex}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
          />
        </div>
      </div>

      <div className={s.actions}>
        <PrimaryButton type="button" icon={faSave} onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </PrimaryButton>
        <PrimaryButton type="button" icon={faCloud} disabled>
          Save Cloud
        </PrimaryButton>
      </div>
    </div>
  );
};
