import s from './index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, updateDocumentContent } from '../../../db';
import { setShowEditorSettings } from '../../../store/editorSlice';
import { Spinner } from '../Spinner';
import { PageList } from '../DocumentCreateForm/PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import { faArrowLeft, faCloudUpload, faGear, faSave } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type SaveStatus = 'idle' | 'saving' | 'saved';

export const DocumentEditForm: React.FC = () => {
  const { id, page } = useParams<{ id: string, page?: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const autoSave = useAppSelector((state) => state.editor.autoSave);

  const [documentTitle, setDocumentTitle] = useState('');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState(Number(page) - 1 || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [hasChanges, setHasChanges] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

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
        hasLoaded.current = true;
      } catch {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  useEffect(() => {
    if (!autoSave || !hasLoaded.current || !logged || !id || !documentTitle || pagesContent.length === 0) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');

    autoSaveTimer.current = setTimeout(async () => {
      try {
        await updateDocumentContent(id, userData.id!, {
          title: documentTitle,
          pagesContent: JSON.stringify(pagesContent),
        });
        setHasChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('idle');
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [pagesContent, documentTitle, autoSave]);

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
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!documentTitle || pagesContent.length === 0 || !logged || !id) return;
    try {
      await updateDocumentContent(id, userData.id!, {
        title: documentTitle,
        pagesContent: JSON.stringify(pagesContent),
      });
      setHasChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save document:', err);
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

        {saveStatus === 'saving' && <span className={s.saveStatus}>Guardando...</span>}
        {saveStatus === 'saved' && <span className={s.saveStatus}>Guardado</span>}

        <IconButton icon={faGear} variant='transparent' onClick={() => dispatch(setShowEditorSettings(true))} />
        <IconButton icon={faSave} variant='transparent' disabled={!hasChanges} onClick={handleSave} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' onClick={() => {}} />
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
