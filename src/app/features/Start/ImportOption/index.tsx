import s from '../../../components/Start/ImportOption/index.module.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { faFileImport, faPlus, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../../store/spellSlice';
import { useAppSelector } from '../../../../store/hooks';
import { SpellCreateInput } from '../../../components/Inputs/SpellCreateInput';
import { SecondaryButton } from '../../../components/Buttons/SecondaryButton';
import { useLanguage } from '../../../../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// A file waiting to become a spell: a PDF (created from it) or a .spell (imported as it is).
interface PendingFile {
  // Its own id, as the card's key: removing one card must not hand its state (a spell
  // already created, a creation in progress) to the card after it.
  id: string;
  // A .spell file, imported as it is; without one, it's a PDF (its content below).
  spellFile?: File;
  fileContent: string;
  size: number;
  type: string | undefined;
  title: string;
  totalPages: number;
}

// Every picked file -- a PDF or a .spell -- becomes a card, created or imported from it (one
// at a time or all together); none opens its spell when done: the card offers it.
export const ImportOption: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [createAllTriggered, setCreateAllTriggered] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
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
          resolve({ id: crypto.randomUUID(), fileContent, size: file.size, type: fileType, title: fileName, totalPages: pdf.numPages });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Nothing picked here is kept in the store; clearing it on leaving keeps a PDF picked by an
  // older flow from showing up in the next import.
  useEffect(() => () => { dispatch(resetSpellState()); }, [dispatch]);

  const isSpellFile = (f: File) => f.name.toLowerCase().endsWith('.spell');

  // A .spell file as a card: it's a spell already, imported as it is.
  const spellFileCard = (file: File): PendingFile => ({
    id: crypto.randomUUID(), spellFile: file, fileContent: '', size: file.size, type: 'spell',
    title: file.name.replace(/\.spell$/i, ''), totalPages: 0,
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const all = Array.from(files);
    const spellFiles = all.filter(isSpellFile);
    const pdfFiles = all.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0 && spellFiles.length === 0) return;

    // A .spell goes through the same review as a PDF: listed, then imported from its card.
    const spellCards = spellFiles.map(spellFileCard);
    if (pdfFiles.length === 0) { setPendingFiles(prev => [...prev, ...spellCards]); return; }

    setIsProcessing(true);
    try {
      const results = await Promise.all(pdfFiles.map(readFile));
      setPendingFiles(prev => [...prev, ...results, ...spellCards]);
    } catch (err) {
      console.error(err);
      if (spellCards.length > 0) setPendingFiles(prev => [...prev, ...spellCards]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

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

  const removePending = (id: string) =>
    setPendingFiles(prev => prev.filter(f => f.id !== id));

  // One of them failed: the buttons come back, so the failed ones can be created again
  // (Create all skips the ones already created or still going) or more files added.
  const handleCardError = () => setCreateAllTriggered(false);

  const hasAnyFile = pendingFiles.length > 0;
  const allDone = hasAnyFile && doneCount >= pendingFiles.length;

  const resetAll = () => {
    setPendingFiles([]);
    setDoneCount(0);
    setCreateAllTriggered(false);
  };

  // Every card creates (or imports) its own spell: they all stay listed with their own
  // progress until done, each PDF with its own "save original" choice.
  const handleCreateAll = () => {
    if (!userData?.id) return;
    setCreateAllTriggered(true);
  };

  // The button for them all says what it does: Create for PDFs, Import for .spell files.
  const allSpellFiles = pendingFiles.every(f => f.spellFile);
  const allPdfs = pendingFiles.every(f => !f.spellFile);
  const createAllLabel = pendingFiles.length === 1
    ? (allSpellFiles ? t.editor.importSpell : t.editor.createSpell)
    : allSpellFiles ? t.editor.importAll : t.editor.createAll;

  if (isProcessing) return (
    <div className={s.processing}>
      <div className={s.processingSpinner} />
      <span>{t.spell.processingPdf}</span>
    </div>
  );

  return hasAnyFile ? (
    <div data-testid="import-option-files" className={s.container}>
      {pendingFiles.map((f) => (
        <SpellCreateInput
          key={f.id}
          spell={{ ...f, currentPage: 0, isLoaded: true }}
          spellFile={f.spellFile}
          onRemove={() => removePending(f.id)}
          autoCreate={createAllTriggered}
          onError={handleCardError}
          onDone={() => setDoneCount(prev => prev + 1)}
        />
      ))}
      {!createAllTriggered && !allDone && (
        <>
          <input
            ref={addMoreInputRef}
            type="file"
            accept=".pdf,.spell"
            multiple
            className={s.fileInput}
            onChange={handleFileChange}
            data-testid="import-option-file-input"
          />
          <button data-testid="import-option-add-more" className={s.addMoreBtn} onClick={() => addMoreInputRef.current?.click()}>
            <FontAwesomeIcon icon={faPlus} />
            {t.start.addMore}
          </button>
        </>
      )}
      {!createAllTriggered && !allDone && (
        <SecondaryButton data-testid="import-option-create-all" className={s.fullWidthBtn} icon={allPdfs ? faUpload : faFileImport} text={createAllLabel} onClick={handleCreateAll} />
      )}
      {allDone && (
        <SecondaryButton data-testid="import-option-import-new" className={s.fullWidthBtn} icon={faFileImport} text={t.start.orImportNew} onClick={resetAll} />
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
        accept=".pdf,.spell"
        multiple
        onChange={handleFileChange}
        className={s.fileInput}
        id="file-input"
        data-testid="import-option-file-input"
      />
      <label htmlFor="file-input" className={s.fileInputLabel}>
        <FontAwesomeIcon icon={faUpload} size="3x" />
        {t.start.dragDrop}
      </label>
    </div>
  );
};
