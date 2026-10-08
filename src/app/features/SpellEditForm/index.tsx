import s from '../../components/SpellEditForm/index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useBlocker, useParams } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { selectCurrentCredential } from '../../../store/credentialsSlice';
import { getSpellById, updateSpellContent, updateSpellFull } from '../../../db';
import { hasOriginalPdf, getOriginalPdf } from '../../../db/originalPdfs';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { renderPageToCover, blobToDataUrl, downscaleImageBlob, extractPdfPage } from '../../../utils/pdfUtils';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import { setShowEditorSettings } from '../../../store/editorSlice';
import { invalidateContent, invalidateSpellList } from '../../../store/spellReaderSlice';
import { enqueueUpload } from '../../../store/spellUploadSlice';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { textToSpeechService } from '../../../services/tts';
import { useUpdateSpellsFromPdf } from '../../../hooks/useUpdateSpellsFromPdf';
import { Spinner } from '../../components/Spinner';
import { PageList } from '../../components/SpellCreateForm/PageList';
import { PageListPlace } from '../../components/SpellCreateForm/PageListOverlay';
import { usePageListToggle } from '../../../hooks/usePageListToggle';
import { SpellEditor } from '../../components/Editors/SpellEditor';
import { isCoverPage } from '../../../utils/spellPage';
import { faArrowLeft, faCloudUpload, faGear, faSave, faTriangleExclamation, faFilePdf, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { PdfProcessingStatus } from '../../components/PdfProcessingStatus';
import { IconButton } from '../../components/Buttons/IconButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { CustomModal } from '../../components/Modals/CustomModal';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { SpellMetadataFields } from '../../components/SpellMetadataFields';
import { EmptyState } from '../../components/EmptyState';
import type { TTSPlayPayload } from '../../../magictext/types';
import { useLanguage } from '../../../i18n';
import { useGoBack } from '../../../hooks/useGoBack';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type SaveStatus = 'idle' | 'saving' | 'saved';

const SHOW_ORIGINAL_KEY = 'spellcast.editor.showOriginalPdf';

export const SpellEditForm: React.FC = () => {
  const { id, page } = useParams<{ id: string, page?: string }>();
  // Back where it was opened from; opened directly, to the spell's page -- or the editor,
  // when there's no spell to go back to.
  const goBack = useGoBack(`/spell/${id}`);
  const goBackFromMissing = useGoBack('/editor');
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const { t } = useLanguage();
  const autoSave = useAppSelector((state) => state.editor.autoSave);
  const activeCredential = useAppSelector(selectCurrentCredential);
  const aiVoices = activeCredential?.voices ?? [];

  const ttsMarks = aiVoices.map((v) => ({ id: v.value, name: v.name, voices: [v.value] }));

  const [spellTitle, setSpellTitle] = useState('');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState(Number(page) - 1 || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [hasChanges, setHasChanges] = useState(false);

  // TCORE-103: editing the same social/feed metadata TCORE-97 introduced at creation time.
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [language, setLanguage] = useState('');
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [spellHasOriginalPdf, setSpellHasOriginalPdf] = useState(false);
  // The page list, shown or hidden from the top bar (see PageListPlace).
  const pageList = usePageListToggle();
  // The page compared with the original PDF's (beside it, or on its back; see SpellEditor).
  // Remembered for the next spell edited (this browser's own preference).
  const [showOriginal, setShowOriginal] = useState(() => {
    try { return localStorage.getItem(SHOW_ORIGINAL_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SHOW_ORIGINAL_KEY, showOriginal ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [showOriginal]);
  const [showRefreshMetadataModal, setShowRefreshMetadataModal] = useState(false);
  const updateFromPdf = useUpdateSpellsFromPdf();

  // TCORE-122: cover preview, loaded from the existing Blob (see `load` below) and
  // replaced whenever the user picks a new one (upload or "use PDF page 1").
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const parseTagsInput = (raw: string): string[] | undefined => {
    const trimmed = raw.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    return trimmed.length ? trimmed : undefined;
  };

  const applyMetadataFromDoc = (doc: { description?: string; author?: string; tags?: string[]; language?: string }) => {
    setDescription(doc.description ?? '');
    setAuthor(doc.author ?? '');
    setTagsInput(doc.tags?.length ? doc.tags.join(', ') : '');
    setLanguage(doc.language ?? '');
  };

  const [originalPages, setOriginalPages] = useState<JSONContent[] | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  // A page about to be deleted, or restored from the PDF: asked first (its edits would go).
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [pageToReset, setPageToReset] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [processingCollapsed, setProcessingCollapsed] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const activeJob = useAppSelector(state =>
    state.spellUpload.queue.find(j => j.targetDocId === id && (j.status === 'queued' || j.status === 'processing'))
  );
  const isProcessingPdf = !!activeJob;
  const { contentVersion } = useAppSelector(state => state.spellReader);
  const contentVersionRef = useRef(contentVersion);

  useEffect(() => {
    if (contentVersion === contentVersionRef.current) return;
    contentVersionRef.current = contentVersion;
    if (!id || !logged) return;
    getSpellById(id, userData.id).then(doc => {
      if (!doc) return;
      const pages: JSONContent[] = doc.pagesContent ? JSON.parse(doc.pagesContent) : [emptyContent];
      const finalPages = pages.length > 0 ? pages : [emptyContent];
      setPagesContent(finalPages);
      if (doc.originalPagesContent) setOriginalPages(JSON.parse(doc.originalPagesContent));
      // The title too: an update from the PDF may have brought the PDF's own, and the form
      // saving its old one would undo it.
      setSpellTitle(doc.title);
      applyMetadataFromDoc(doc);
      // "Replace content" (TCORE-90's import flow) regenerates the cover from the new
      // PDF's page 1 same as SpellCreateForm's import, so re-sync the preview here too.
      Promise.resolve(doc.cover ? blobToDataUrl(doc.cover) : null).then(setCoverUrl);
      setHasChanges(false);
    });
    //eslint-disable-next-line
  }, [contentVersion]);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopTTSPreview = () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    if (ttsSpeechRef.current) { window.speechSynthesis.cancel(); ttsSpeechRef.current = null; }
    setTtsPlaying(false);
  };

  const handleTTSPlay = (payload: TTSPlayPayload) => {
    stopTTSPreview();
    const isAIVoice = payload.voice ? aiVoices.some((v) => v.value === payload.voice) : false;
    if (isAIVoice && payload.voice) {
      setTtsPlaying(true);
      textToSpeechService({ doc: payload.doc, voice: payload.voice })
        .then(({ blob }) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          ttsAudioRef.current = audio;
          audio.onended = () => { ttsAudioRef.current = null; setTtsPlaying(false); URL.revokeObjectURL(url); };
          audio.onerror = () => { ttsAudioRef.current = null; setTtsPlaying(false); URL.revokeObjectURL(url); };
          audio.play();
        })
        .catch(() => setTtsPlaying(false));
    } else {
      const utt = new SpeechSynthesisUtterance(payload.text);
      if (payload.voice) {
        const match = window.speechSynthesis.getVoices().find(
          (v) => v.name === payload.voice || v.voiceURI === payload.voice
        );
        if (match) utt.voice = match;
      }
      utt.onend = () => { ttsSpeechRef.current = null; setTtsPlaying(false); };
      utt.onerror = () => { ttsSpeechRef.current = null; setTtsPlaying(false); };
      ttsSpeechRef.current = utt;
      setTtsPlaying(true);
      window.speechSynthesis.speak(utt);
    }
  };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !logged) return;
      try {
        const doc = await getSpellById(id, userData.id);
        if (!doc) { setError('Spell not found.'); return; }
        setSpellTitle(doc.title);
        const pages: JSONContent[] = doc.pagesContent
          ? JSON.parse(doc.pagesContent)
          : [emptyContent];
        const finalPages = pages.length > 0 ? pages : [emptyContent];
        setPagesContent(finalPages);
        if (doc.originalPagesContent) {
          setOriginalPages(JSON.parse(doc.originalPagesContent));
        }
        applyMetadataFromDoc(doc);
        setCoverUrl(doc.cover ? await blobToDataUrl(doc.cover) : null);
        hasLoaded.current = true;
      } catch {
        setError('Failed to load spell.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  // TCORE-103: gates the "Update from PDF" action -- same pattern as SpellDetail's "PDF"
  // tag (TCORE-90), re-checked on contentVersion since a "replace content" upload can
  // change whether an original PDF is stored for this spell.
  useEffect(() => {
    if (!id) { setSpellHasOriginalPdf(false); return; }
    hasOriginalPdf(id).then(setSpellHasOriginalPdf);
  }, [id, contentVersion]);

  useEffect(() => {
    if (!autoSave || !hasLoaded.current || !logged || !id || !spellTitle || pagesContent.length === 0) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');

    autoSaveTimer.current = setTimeout(async () => {
      try {
        await updateSpellContent(id, userData.id!, {
          title: spellTitle,
          pagesContent: JSON.stringify(pagesContent),
          description: description || undefined,
          author: author || undefined,
          tags: parseTagsInput(tagsInput),
          language: language || undefined,
        });
        setHasChanges(false);
        setSaveStatus('saved');
        dispatch(invalidateContent());
        dispatch(invalidateSpellList());
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('idle');
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    //eslint-disable-next-line
  }, [pagesContent, spellTitle, description, author, tagsInput, language, autoSave]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowImportModal(true);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingFile || !id || !userData.id) return;
    setShowImportModal(false);
    setProcessingCollapsed(false);
    const reader = new FileReader();
    const fileContent: string = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(pendingFile);
    });
    dispatch(enqueueUpload({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: spellTitle,
      fileContent,
      saveOriginal: true,
      userId: userData.id,
      targetDocId: id,
    }));
    setPendingFile(null);
  };

  const handlePageClick = (index: number) => {
    setEditingPageIndex(index);
  };

  const handlePageDelete = (index: number) => {
    const updated = pagesContent.filter((_, i) => i !== index);
    setPagesContent(updated);
    setEditingPageIndex(Math.min(Number(editingPageIndex), updated.length - 1));
    setHasChanges(true);
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
    setEditingPageIndex(pagesContent.length);
    setHasChanges(true);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updated = [...pagesContent];
    updated[Number(editingPageIndex)] = newContent;
    setPagesContent(updated);
    setHasChanges(true);
  };

  // Saves the spell as it is now -- with `pages` in place of the form's pages when given (a
  // change saved right away, before the form's state has it).
  const saveNow = async (pages: JSONContent[] = pagesContent) => {
    if (!spellTitle || pages.length === 0 || !logged || !id) return;
    try {
      await updateSpellContent(id, userData.id!, {
        title: spellTitle,
        pagesContent: JSON.stringify(pages),
        description: description || undefined,
        author: author || undefined,
        tags: parseTagsInput(tagsInput),
        language: language || undefined,
      });
      setHasChanges(false);
      setSaveStatus('saved');
      dispatch(invalidateContent());
      dispatch(invalidateSpellList());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save spell:', err);
    }
  };

  const handleSave = () => saveNow();

  // Unsaved edits: leaving the page asks first (in the app), or the browser does (reloading,
  // closing the tab).
  const blocker = useBlocker(hasChanges);
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  // TCORE-122: cover changes save immediately (like the "replace content"/"reset" actions
  // below) instead of going through the autosave timer -- there's no draft state worth
  // previewing before committing a new cover.
  //
  // updateSpellFull is a full-record write, so it necessarily also writes whatever title/
  // pagesContent are currently in memory -- including a title edit or page edit the user
  // hasn't explicitly saved yet. That was already true before this fix; what wasn't handled
  // is that it leaves `hasChanges` stale afterwards (review follow-up): the in-memory state
  // IS what just got persisted, so resetting hasChanges/saveStatus here is what keeps the Save button and
  // "Saved" indicator honest about there being nothing left to save, the same way handleSave
  // does for its own write.
  const applyCover = async (blob: Blob) => {
    if (!id || !userData.id) return;
    // The spell's thumbnail only -- its pages stay as the PDF has them.
    const dataUrl = await blobToDataUrl(blob);
    setCoverUrl(dataUrl);
    try {
      await updateSpellFull(id, userData.id, {
        title: spellTitle,
        pagesContent: JSON.stringify(pagesContent),
        cover: blob,
        originalPagesContent: originalPages ? JSON.stringify(originalPages) : undefined,
      });
      setHasChanges(false);
      setSaveStatus('saved');
      dispatch(invalidateContent());
      dispatch(invalidateSpellList());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save new cover:', err);
    }
  };

  // Downscaled before it ever reaches applyCover -- an unprocessed upload can be several MB,
  // which would otherwise count fully against the spell's IndexedDB storage quota (TCORE-117)
  // for an image only ever shown at thumbnail size (review follow-up).
  const handleCoverUpload = (file: File) => { void downscaleImageBlob(file).then(applyCover); };

  const handleUseFirstPageCover = async () => {
    if (!id) return;
    const pdfBlob = await getOriginalPdf(id);
    if (!pdfBlob) return;
    const pdf = await pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
    const coverBlob = await renderPageToCover(pdf);
    if (coverBlob) void applyCover(coverBlob);
  };

  // Read again from the stored original PDF -- pages and metadata alike -- by the upload
  // worker, which shows its progress here; once it's done, contentVersion reloads this form
  // from the updated spell (see above).
  const handleRefreshMetadataConfirm = async () => {
    setShowRefreshMetadataModal(false);
    if (!id) return;
    const { queued } = await updateFromPdf([id], { report: false });
    if (!queued) dispatch(addApiResponse({ message: t.spell.updateFromPdfNoPdf, type: 'error' }));
  };

  // Back to the original: read again from the stored PDF when there is one -- so the pages
  // come back as the current extraction reads them, not as an older one did when the spell
  // was imported -- or, without it, the pages saved at import.
  const handleResetAll = async () => {
    setShowResetAllModal(false);
    if (id && spellHasOriginalPdf) {
      // By the upload worker (its progress shows here); its pages only, not the title or
      // details. Once done, contentVersion reloads this form from the updated spell.
      const { queued } = await updateFromPdf([id], { report: false, pagesOnly: true });
      if (queued) return;
    }
    if (!originalPages) return;
    // Saved right away, as a reset from the PDF is.
    const restored = originalPages.map(p => ({ ...p }));
    setPagesContent(restored);
    await saveNow(restored);
  };

  const handleResetPage = async (index: number) => {
    let fresh = originalPages?.[index] ? { ...originalPages[index] } : null;
    if (id && spellHasOriginalPdf) {
      try {
        const blob = await getOriginalPdf(id);
        if (blob) {
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
          const page = await extractPdfPage(pdf, index + 1);
          fresh = page;
          // The stored original is this reading of it from now on.
          setOriginalPages(prev => (prev ? prev.map((p, i) => (i === index ? page : p)) : prev));
        }
      } catch (err) {
        console.error('Failed to read the page again from the PDF:', err);
      }
    }
    if (!fresh) return;
    const updated = [...pagesContent];
    updated[index] = fresh;
    setPagesContent(updated);
    // Saved right away: a reset is done once confirmed, nothing left to save.
    await saveNow(updated);
  };

  if (isLoading) return <div data-testid="spell-edit-form-loading" className={s.container}><Spinner isLoading /></div>;
  if (error) return (
    <div data-testid="spell-edit-form-error" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton data-testid="spell-edit-form-error-back-btn" icon={faArrowLeft} className={s.backButton} variant='transparent' title={t.common.back} onClick={goBackFromMissing} />
      </div>
      <EmptyState icon={faTriangleExclamation} message={error} />
    </div>
  );

  return (
    <div data-testid="spell-edit-form" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton data-testid="spell-edit-back-btn" icon={faArrowLeft} className={s.backButton} variant='transparent' title={t.common.back} onClick={goBack} />
        <span className={s.titleContainer}>
          <input
            data-testid="spell-edit-title-input"
            className={s.spellTitle}
            type="text"
            placeholder={t.spell.titlePlaceholder}
            value={spellTitle}
            onChange={(e) => { setSpellTitle(e.target.value); setHasChanges(true); }}
          />
        </span>

        {isProcessingPdf && processingCollapsed && (
          <PdfProcessingStatus
            variant="compact"
            progress={activeJob?.progress ?? null}
            coverUrl={activeJob?.coverUrl ?? null}
            spellTitle={spellTitle}
            onExpand={() => setProcessingCollapsed(false)}
          />
        )}
        {!isProcessingPdf && saveStatus === 'saving' && <span className={s.saveStatus}>{t.common.saving}</span>}
        {!isProcessingPdf && saveStatus === 'saved' && <span className={s.saveStatus}>{t.common.saved}</span>}

        {/* Replacing the PDF and restoring the spell are the PDF panel's own (see SpellEditor's
            pdfPanel): it opens this picker. */}
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
        <IconButton
          data-testid="page-list-toggle"
          data-page-list-toggle
          icon={faLayerGroup}
          variant='transparent'
          className={pageList.open ? s.headerBtnActive : undefined}
          title={pageList.open ? t.spell.hidePages : t.spell.showPages}
          aria-pressed={pageList.open}
          onClick={pageList.toggle}
        />
        <IconButton
          data-testid="spell-edit-original-btn"
          icon={faFilePdf}
          variant='transparent'
          className={showOriginal ? s.headerBtnActive : undefined}
          title={t.spell.showOriginal}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal(v => !v)}
        />
        <IconButton data-testid="spell-edit-save-btn" icon={faSave} variant='transparent' title={t.common.save} disabled={!hasChanges || isProcessingPdf} onClick={handleSave} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' title={t.nav.cloud} onClick={() => {}} />
        <IconButton icon={faGear} variant='transparent' onClick={() => dispatch(setShowEditorSettings(true))} />
      </div>

      <SpellMetadataFields
        expanded={metadataExpanded}
        onToggleExpanded={() => setMetadataExpanded((v) => !v)}
        coverUrl={coverUrl}
        onCoverUploadImage={handleCoverUpload}
        onCoverUseFirstPage={spellHasOriginalPdf ? handleUseFirstPageCover : undefined}
        description={description}
        onDescriptionChange={(v) => { setDescription(v); setHasChanges(true); }}
        author={author}
        onAuthorChange={(v) => { setAuthor(v); setHasChanges(true); }}
        tagsInput={tagsInput}
        onTagsInputChange={(v) => { setTagsInput(v); setHasChanges(true); }}
        language={language}
        onLanguageChange={(v) => { setLanguage(v); setHasChanges(true); }}
        onRefreshFromPdf={() => setShowRefreshMetadataModal(true)}
        refreshDisabled={!spellHasOriginalPdf}
        isRefreshing={isProcessingPdf}
      />

      <div className={s.editorContainer}>
        {isProcessingPdf && !processingCollapsed && (
          <PdfProcessingStatus
            variant="overlay"
            progress={activeJob?.progress ?? null}
            coverUrl={activeJob?.coverUrl ?? null}
            spellTitle={spellTitle}
            onCollapse={() => setProcessingCollapsed(true)}
          />
        )}
        <div className={s.editorWrapper}>
          <SpellEditor
            pageNumber={Number(editingPageIndex) + 1}
            pageContent={pagesContent[Number(editingPageIndex)]}
            onPageContentChange={handlePageContentChange}
            onMarginsChange={isCoverPage(pagesContent[Number(editingPageIndex)], Number(editingPageIndex)) ? undefined : (m) => {
              const idx = Number(editingPageIndex);
              const updated = [...pagesContent];
              const page = updated[idx];
              updated[idx] = { ...page, attrs: { ...(page?.attrs as object ?? {}), ...m } };
              setPagesContent(updated);
              setHasChanges(true);
            }}
            ttsMarks={ttsMarks}
            onTTSPlay={handleTTSPlay}
            onTTSStop={stopTTSPreview}
            ttsPlaying={ttsPlaying}
            pdfPanel={showOriginal && id ? {
              spellId: id,
              hasOriginal: spellHasOriginalPdf,
              busy: isProcessingPdf,
              onReplacePdf: () => pdfInputRef.current?.click(),
              onRestoreAll: originalPages || spellHasOriginalPdf ? () => setShowResetAllModal(true) : undefined,
              onRestorePage: originalPages || spellHasOriginalPdf ? () => setPageToReset(Number(editingPageIndex)) : undefined,
            } : null}
          />
        </div>
        <PageListPlace toggle={pageList} className={s.pagesContainer}>
          {(overlay) => (
            <PageList
              pages={pagesContent.map(() => '')}
              currentPage={Number(editingPageIndex)}
              onPageClick={handlePageClick}
              onPageDelete={setPageToDelete}
              onAddPage={handleAddPage}
              onPageReset={originalPages || spellHasOriginalPdf ? setPageToReset : undefined}
              pdfProgress={activeJob?.progress ?? null}
              column={overlay}
            />
          )}
        </PageListPlace>
      </div>

      <CustomModal compact show={showImportModal} onClose={() => { setShowImportModal(false); setPendingFile(null); }} title={t.spell.replaceContent}>
        <div className={s.importModalBody}>
          <p>{t.spell.replaceContentDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => { setShowImportModal(false); setPendingFile(null); }}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleImportConfirm}>{t.common.replace}</PrimaryButton>
          </div>
        </div>
      </CustomModal>

      <DeleteConfirmModal
        show={pageToDelete !== null}
        onClose={() => setPageToDelete(null)}
        onConfirm={() => { if (pageToDelete !== null) handlePageDelete(pageToDelete); setPageToDelete(null); }}
        title={t.spell.deletePageTitle}
        message={t.spell.deletePageConfirm.replace('{n}', String((pageToDelete ?? 0) + 1))}
      />
      <DeleteConfirmModal
        show={pageToReset !== null}
        onClose={() => setPageToReset(null)}
        onConfirm={async () => { const index = pageToReset; setPageToReset(null); if (index !== null) await handleResetPage(index); }}
        title={t.spell.resetPage}
        message={t.spell.resetPageConfirm.replace('{n}', String((pageToReset ?? 0) + 1))}
        confirmText={t.spell.resetPage}
      />

      <DeleteConfirmModal
        show={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title={t.spell.unsavedChangesTitle}
        message={t.spell.unsavedChangesMessage}
        confirmText={t.spell.leaveWithoutSaving}
      />

      <CustomModal compact show={showResetAllModal} onClose={() => setShowResetAllModal(false)} title={t.spell.resetAllTitle}>
        <div className={s.importModalBody}>
          <p>{t.spell.resetAllDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => setShowResetAllModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleResetAll}>{t.spell.resetAll}</PrimaryButton>
          </div>
        </div>
      </CustomModal>

      <CustomModal compact show={showRefreshMetadataModal} onClose={() => setShowRefreshMetadataModal(false)} title={t.spell.updateFromPdfConfirmTitle}>
        <div className={s.importModalBody}>
          <p>{t.spell.updateFromPdfConfirmDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => setShowRefreshMetadataModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton data-testid="refresh-metadata-confirm-btn" onClick={handleRefreshMetadataConfirm}>{t.spell.updateFromPdf}</PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
