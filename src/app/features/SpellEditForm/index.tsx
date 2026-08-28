import s from '../../components/SpellEditForm/index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { selectCurrentCredential } from '../../../store/credentialsSlice';
import { getSpellById, updateSpellContent } from '../../../db';
import { hasOriginalPdf } from '../../../db/originalPdfs';
import { setShowEditorSettings } from '../../../store/editorSlice';
import { invalidateContent, invalidateSpellList } from '../../../store/spellReaderSlice';
import { enqueueUpload } from '../../../store/spellUploadSlice';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { textToSpeechService } from '../../../services/tts';
import { useRefreshSpellMetadataFromPdf } from '../../../hooks/useRefreshSpellMetadataFromPdf';
import { Spinner } from '../../components/Spinner';
import { PageList } from '../../components/SpellCreateForm/PageList';
import { SpellEditor, PageMargins } from '../../components/Editors/SpellEditor';
import { faArrowLeft, faCloudUpload, faPaperclip, faGear, faSave, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { PdfProcessingStatus } from '../../components/PdfProcessingStatus';
import { IconButton } from '../../components/Buttons/IconButton';
import { CustomModal } from '../../components/Modals/CustomModal';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { SpellMetadataFields } from '../../components/SpellMetadataFields';
import type { TTSPlayPayload } from '../../../magictext/types';
import { useLanguage } from '../../../i18n';

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type SaveStatus = 'idle' | 'saving' | 'saved';

export const SpellEditForm: React.FC = () => {
  const { id, page } = useParams<{ id: string, page?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [currentMargins, setCurrentMargins] = useState<PageMargins>({ marginTop: 48, marginRight: 64, marginBottom: 48, marginLeft: 64 });

  // TCORE-103: editing the same social/feed metadata TCORE-97 introduced at creation time.
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [language, setLanguage] = useState('');
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [spellHasOriginalPdf, setSpellHasOriginalPdf] = useState(false);
  const [showRefreshMetadataModal, setShowRefreshMetadataModal] = useState(false);
  const { refreshOne, isRefreshing } = useRefreshSpellMetadataFromPdf();

  const isCoverPage = (p: JSONContent): boolean => {
    const first = p?.content?.[0];
    return first?.type === 'image' && (first?.attrs as Record<string, unknown>)?.title !== 'pdf-graphic';
  };

  const getMarginsFromPage = (p: JSONContent): PageMargins => {
    if (isCoverPage(p)) return { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 };
    const a = p?.attrs as Record<string, number> | undefined;
    return {
      marginTop: a?.marginTop ?? 48,
      marginRight: a?.marginRight ?? 64,
      marginBottom: a?.marginBottom ?? 48,
      marginLeft: a?.marginLeft ?? 64,
    };
  };
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
      applyMetadataFromDoc(doc);
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
        const initIndex = Number(page) - 1 || 0;
        setCurrentMargins(getMarginsFromPage(finalPages[initIndex] ?? finalPages[0]));
        hasLoaded.current = true;
      } catch {
        setError('Failed to load spell.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    //eslint-disable-next-line
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
    setCurrentMargins(getMarginsFromPage(pagesContent[index]));
  };

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
    if (!spellTitle || pagesContent.length === 0 || !logged || !id) return;
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
      console.error('Failed to save spell:', err);
    }
  };

  const handleRefreshMetadataConfirm = async () => {
    setShowRefreshMetadataModal(false);
    if (!id) return;
    const result = await refreshOne(id);
    if (result.status === 'updated' && result.metadata) {
      if (result.metadata.title) setSpellTitle(result.metadata.title);
      applyMetadataFromDoc(result.metadata);
      dispatch(invalidateSpellList());
      dispatch(addApiResponse({ message: t.spell.refreshMetadataSuccess, type: 'success' }));
    } else {
      dispatch(addApiResponse({ message: t.spell.refreshMetadataNoPdf, type: 'error' }));
    }
  };

  const handleResetAll = () => {
    if (!originalPages) return;
    const fresh = originalPages.map(p => ({ ...p }));
    setPagesContent(fresh);
    setCurrentMargins(getMarginsFromPage(fresh[Number(editingPageIndex)] ?? fresh[0]));
    setHasChanges(true);
    setShowResetAllModal(false);
  };

  const handleResetPage = (index: number) => {
    if (!originalPages || !originalPages[index]) return;
    const updated = [...pagesContent];
    updated[index] = { ...originalPages[index] };
    setPagesContent(updated);
    if (index === Number(editingPageIndex)) {
      setCurrentMargins(getMarginsFromPage(originalPages[index]));
    }
    setHasChanges(true);
  };

  if (isLoading) return <div data-testid="spell-edit-form-loading" className={s.container}><Spinner isLoading /></div>;
  if (error) return <div data-testid="spell-edit-form-error" className={s.container}><div className={s.error}>{error}</div></div>;

  return (
    <div data-testid="spell-edit-form" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' title={t.common.back} onClick={() => navigate((location.state as { from?: string })?.from ?? `/spell/${id}`)} />
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

        <IconButton icon={faPaperclip} variant='transparent' title={t.spell.replaceContent} disabled={isProcessingPdf} onClick={() => pdfInputRef.current?.click()} />
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
        {originalPages && <IconButton icon={faRotateLeft} variant='transparent' title={t.spell.resetAllTitle} disabled={isProcessingPdf} onClick={() => setShowResetAllModal(true)} />}
        <IconButton data-testid="spell-edit-save-btn" icon={faSave} variant='transparent' title={t.common.save} disabled={!hasChanges || isProcessingPdf} onClick={handleSave} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' title={t.nav.cloud} onClick={() => {}} />
        <IconButton icon={faGear} variant='transparent' onClick={() => dispatch(setShowEditorSettings(true))} />
      </div>

      <SpellMetadataFields
        expanded={metadataExpanded}
        onToggleExpanded={() => setMetadataExpanded((v) => !v)}
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
        isRefreshing={isRefreshing}
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
            margins={currentMargins}
            onMarginsChange={isCoverPage(pagesContent[Number(editingPageIndex)]) ? undefined : (m) => {
              setCurrentMargins(m);
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
          />
        </div>
        <div className={s.pagesContainer}>
          <PageList
            pages={pagesContent.map(() => '')}
            currentPage={Number(editingPageIndex)}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
            onPageReset={originalPages ? handleResetPage : undefined}
            pdfProgress={activeJob?.progress ?? null}
          />
        </div>
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

      <CustomModal compact show={showResetAllModal} onClose={() => setShowResetAllModal(false)} title={t.spell.resetAllTitle}>
        <div className={s.importModalBody}>
          <p>{t.spell.resetAllDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => setShowResetAllModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleResetAll}>{t.spell.resetAll}</PrimaryButton>
          </div>
        </div>
      </CustomModal>

      <CustomModal compact show={showRefreshMetadataModal} onClose={() => setShowRefreshMetadataModal(false)} title={t.spell.refreshMetadataConfirmTitle}>
        <div className={s.importModalBody}>
          <p>{t.spell.refreshMetadataConfirmDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => setShowRefreshMetadataModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton data-testid="refresh-metadata-confirm-btn" onClick={handleRefreshMetadataConfirm}>{t.spell.refreshMetadataFromPdf}</PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
