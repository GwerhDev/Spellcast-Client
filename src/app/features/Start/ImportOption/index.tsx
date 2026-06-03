import s from '../../../components/Start/ImportOption/index.module.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import React, { useCallback, useRef, useState } from 'react';
import { faPlus, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../../store';
import { resetDocumentState, setDocumentDetails } from '../../../../store/documentSlice';
import { enqueueUpload } from '../../../../store/pdfUploadSlice';
import { useAppSelector } from '../../../../store/hooks';
import { DocumentCreateInput } from '../../../components/Inputs/DocumentCreateInput';
import { useLanguage } from '../../../../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PendingFile {
  fileContent: string;
  size: number;
  type: string | undefined;
  title: string;
  totalPages: number;
}

export const ImportOption: React.FC = () => {
  const document = useSelector((state: RootState) => state.document);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [createAllTriggered, setCreateAllTriggered] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useAppSelector(state => state.session);
  const { t } = useLanguage();

  const readFile = (file: File): Promise<PendingFile> =>
    new Promise((resolve, reject) => {
      const fileType = file.type.split('/').at(-1);
      const fileName = file.name.split('.').filter(e => e !== fileType).join(' ');
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          resolve({ fileContent, size: file.size, type: fileType, title: fileName, totalPages: pdf.numPages });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type === 'application/pdf');
    if (arr.length === 0) return;

    setIsProcessing(true);
    try {
      if (arr.length === 1 && pendingFiles.length === 0 && !document.isLoaded) {
        const f = arr[0];
        const fileType = f.type.split('/').at(-1);
        const fileName = f.name.split('.').filter(e => e !== fileType).join(' ');
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const fileContent = ev.target?.result as string;
              const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
              const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
              dispatch(setDocumentDetails({ fileContent, size: f.size, type: fileType, title: fileName, totalPages: pdf.numPages }));
              resolve();
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        return;
      }

      const results = await Promise.all(arr.map(readFile));
      setPendingFiles(prev => [...prev, ...results]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, document.isLoaded, pendingFiles.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removePending = (index: number) =>
    setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const hasSingleReduxFile = document.isLoaded;
  const hasAnyFile = hasSingleReduxFile || pendingFiles.length > 0;
  const hasMultiple = pendingFiles.length > 1 || (pendingFiles.length > 0 && document.isLoaded);
  const totalCards = pendingFiles.length + (hasSingleReduxFile ? 1 : 0);
  const allDone = totalCards > 0 && doneCount >= totalCards;

  const resetAll = () => {
    dispatch(resetDocumentState());
    setPendingFiles([]);
    setDoneCount(0);
    setCreateAllTriggered(false);
  };

  const handleCreateAll = () => {
    if (!userData?.id) return;
    if (document.isLoaded && document.fileContent && pendingFiles.length > 0) {
      dispatch(enqueueUpload({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: document.title || t.document.untitled,
        fileContent: document.fileContent,
        saveOriginal: true,
        userId: userData.id,
      }));
      dispatch(resetDocumentState());
    }
    setCreateAllTriggered(true);
  };

  if (isProcessing) return (
    <div className={s.processing}>
      <div className={s.processingSpinner} />
      <span>{t.document.processingPdf}</span>
    </div>
  );

  return hasAnyFile ? (
    <div data-testid="import-option-files" className={s.container}>
      {hasSingleReduxFile && (
        <DocumentCreateInput
          document={document}
          onRemove={() => dispatch(resetDocumentState())}
          onDone={(resultDocId) => {
            setDoneCount(prev => prev + 1);
            if (resultDocId) navigate(`/document/${resultDocId}`);
          }}
        />
      )}
      {pendingFiles.map((f, i) => (
        <DocumentCreateInput
          key={i}
          document={{ ...f, currentPage: 0, isLoaded: true }}
          onRemove={() => removePending(i)}
          autoCreate={createAllTriggered}
          onDone={() => setDoneCount(prev => prev + 1)}
        />
      ))}
      {!createAllTriggered && !allDone && hasMultiple && (
        <button className={s.createAllBtn} onClick={handleCreateAll}>
          {t.editor.createAll}
        </button>
      )}
      {!createAllTriggered && !allDone && (
        <>
          <input
            ref={addMoreInputRef}
            type="file"
            accept=".pdf"
            multiple
            className={s.fileInput}
            onChange={handleFileChange}
          />
          <button className={s.addMoreBtn} onClick={() => addMoreInputRef.current?.click()}>
            <FontAwesomeIcon icon={faPlus} />
            {t.start.addMore}
          </button>
        </>
      )}
      {allDone && (
        <p className={s.resetPdf} onClick={resetAll}>
          {t.start.orImportNew}
        </p>
      )}
    </div>
  ) : (
    <div
      data-testid="import-option-dropzone"
      className={`${s.dropzone} ${isDragging ? s.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileChange}
        className={s.fileInput}
        id="file-input"
      />
      <label htmlFor="file-input" className={s.fileInputLabel}>
        <FontAwesomeIcon icon={faUpload} size="3x" />
        {t.start.dragDrop}
      </label>
    </div>
  );
};
