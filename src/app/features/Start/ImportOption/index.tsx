import s from '../../../components/Start/ImportOption/index.module.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { faFileImport, faPlus, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../../store';
import { resetSpellState, setSpellDetails } from '../../../../store/spellSlice';
import { useAppSelector } from '../../../../store/hooks';
import { SpellCreateInput } from '../../../components/Inputs/SpellCreateInput';
import { SecondaryButton } from '../../../components/Buttons/SecondaryButton';
import { useLanguage } from '../../../../i18n';
import { useSpellImport } from '../../../../hooks/useSpellImport';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PendingFile {
  // Its own id, as the card's key: removing one card must not hand its state (a spell
  // already created, a creation in progress) to the card after it.
  id: string;
  fileContent: string;
  size: number;
  type: string | undefined;
  title: string;
  totalPages: number;
}

export const ImportOption: React.FC = () => {
  const spell = useSelector((state: RootState) => state.spell);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [createAllTriggered, setCreateAllTriggered] = useState(false);
  // The files are being created as a batch (Create all was used): none of them opens its
  // new spell when done, even if one failed and the batch was picked up again.
  const createdTogether = useRef(false);
  const [doneCount, setDoneCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useAppSelector(state => state.session);
  const { t } = useLanguage();
  const { importFile } = useSpellImport();

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

  // A single picked PDF waits in the store (spellSlice) rather than here: leaving -- the
  // modal closing, or opening the spell just created from it -- drops it, so the next
  // import starts empty instead of showing this one again.
  useEffect(() => () => { dispatch(resetSpellState()); }, [dispatch]);

  const isSpellFile = (f: File) => f.name.toLowerCase().endsWith('.spell');

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const all = Array.from(files);
    const spellFiles = all.filter(isSpellFile);
    const pdfFiles = all.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0 && spellFiles.length === 0) return;

    // .spell files are already complete spells -- they skip the PDF review flow below
    // entirely and import straight away (same behavior as the import previously had its
    // own separate button for).
    if (spellFiles.length > 0) {
      await Promise.all(spellFiles.map(f => importFile(f)));
    }

    if (pdfFiles.length === 0) return;

    setIsProcessing(true);
    try {
      if (pdfFiles.length === 1 && pendingFiles.length === 0 && !spell.isLoaded) {
        const f = pdfFiles[0];
        const fileType = f.type.split('/').at(-1);
        const fileName = f.name.split('.').filter(e => e !== fileType).join(' ');
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const fileContent = ev.target?.result as string;
              const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
              const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
              dispatch(setSpellDetails({ fileContent, size: f.size, type: fileType, title: fileName, totalPages: pdf.numPages }));
              resolve();
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        return;
      }

      const results = await Promise.all(pdfFiles.map(readFile));
      setPendingFiles(prev => [...prev, ...results]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, spell.isLoaded, pendingFiles.length, importFile]);

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

  const hasSingleReduxFile = spell.isLoaded;
  const hasAnyFile = hasSingleReduxFile || pendingFiles.length > 0;
  const hasMultiple = pendingFiles.length > 1 || (pendingFiles.length > 0 && spell.isLoaded);
  const totalCards = pendingFiles.length + (hasSingleReduxFile ? 1 : 0);
  const allDone = totalCards > 0 && doneCount >= totalCards;

  const resetAll = () => {
    dispatch(resetSpellState());
    setPendingFiles([]);
    setDoneCount(0);
    setCreateAllTriggered(false);
    createdTogether.current = false;
  };

  // Every card creates its own spell, the first one included: they all stay listed with
  // their own progress until done, each with its own "save original" choice.
  const handleCreateAll = () => {
    if (!userData?.id) return;
    createdTogether.current = true;
    setCreateAllTriggered(true);
  };

  if (isProcessing) return (
    <div className={s.processing}>
      <div className={s.processingSpinner} />
      <span>{t.spell.processingPdf}</span>
    </div>
  );

  return hasAnyFile ? (
    <div data-testid="import-option-files" className={s.container}>
      {hasSingleReduxFile && (
        <SpellCreateInput
          spell={spell}
          onRemove={() => dispatch(resetSpellState())}
          autoCreate={createAllTriggered}
          onError={handleCardError}
          onDone={(resultDocId) => {
            setDoneCount(prev => prev + 1);
            // On its own, the new spell opens; created along with others, it stays listed.
            if (resultDocId && !createdTogether.current) navigate(`/spell/${resultDocId}`);
          }}
        />
      )}
      {pendingFiles.map((f) => (
        <SpellCreateInput
          key={f.id}
          spell={{ ...f, currentPage: 0, isLoaded: true }}
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
      {!createAllTriggered && !allDone && hasMultiple && (
        <SecondaryButton data-testid="import-option-create-all" className={s.fullWidthBtn} icon={faUpload} text={t.editor.createAll} onClick={handleCreateAll} />
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
