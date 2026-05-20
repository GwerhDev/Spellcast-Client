import s from './index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getDocumentById, updateDocumentContent, updateDocumentFull, getDocumentOriginalPages } from '../../../db';
import { setShowEditorSettings } from '../../../store/editorSlice';
import { invalidateContent } from '../../../store/pdfReaderSlice';
import { textToSpeechService } from '../../../services/tts';
import { Spinner } from '../Spinner';
import { PageList } from '../DocumentCreateForm/PageList';
import { DocumentEditor, PageMargins } from '../Editors/DocumentEditor';
import { faArrowLeft, faCloudUpload, faPaperclip, faGear, faSave, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { PdfProcessingStatus } from '../PdfProcessingStatus';
import { IconButton } from '../Buttons/IconButton';
import { CustomModal } from '../Modals/CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import type { TTSPlayPayload } from '../../../magictext/types';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, blobToDataUrl } from '../../../utils/pdfUtils';
import { useLanguage } from '../../../i18n';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type SaveStatus = 'idle' | 'saving' | 'saved';

export const DocumentEditForm: React.FC = () => {
  const { id, page } = useParams<{ id: string, page?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector((state) => state.session);
  const { t } = useLanguage();
  const autoSave = useAppSelector((state) => state.editor.autoSave);
  const credentials = useAppSelector((state) => state.credentials.credentials);
  const aiVoices = credentials[0]?.voices ?? [];

  const ttsMarks = aiVoices.map((v) => ({ id: v.value, name: v.name, voices: [v.value] }));

  const [documentTitle, setDocumentTitle] = useState('');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState(Number(page) - 1 || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [hasChanges, setHasChanges] = useState(false);
  const [currentMargins, setCurrentMargins] = useState<PageMargins>({ marginTop: 48, marginRight: 64, marginBottom: 48, marginLeft: 64 });

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
  const [originalPages, setOriginalPages] = useState<JSONContent[] | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [processingCollapsed, setProcessingCollapsed] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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
      textToSpeechService({ text: payload.text, voice: payload.voice })
        .then((blob) => {
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
        const doc = await getDocumentById(id, userData.id);
        if (!doc) { setError('Document not found.'); return; }
        setDocumentTitle(doc.title);
        const pages: JSONContent[] = doc.pagesContent
          ? JSON.parse(doc.pagesContent)
          : [emptyContent];
        const finalPages = pages.length > 0 ? pages : [emptyContent];
        setPagesContent(finalPages);
        if (doc.originalPagesContent) {
          setOriginalPages(JSON.parse(doc.originalPagesContent));
        }
        const initIndex = Number(page) - 1 || 0;
        setCurrentMargins(getMarginsFromPage(finalPages[initIndex] ?? finalPages[0]));
        hasLoaded.current = true;
      } catch {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    //eslint-disable-next-line
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
        dispatch(invalidateContent());
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
  }, [pagesContent, documentTitle, autoSave]);

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
    setIsProcessingPdf(true);
    setPdfProgress(null);
    setCoverUrl(null);
    setProcessingCollapsed(false);
    try {
      const reader = new FileReader();
      const fileContent: string = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pendingFile);
      });
      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      // Render cover first so page 0 is immediately available
      const coverBlob = await renderPageToCover(pdf);
      const coverDataUrl = coverBlob ? await blobToDataUrl(coverBlob) : null;
      if (coverDataUrl) setCoverUrl(coverDataUrl);

      const rawPages = await extractPdfPages(
        pdf,
        (current, total) => setPdfProgress({ current, total }),
        (pageNum, content) => {
          const pageContent: JSONContent = pageNum === 1 && coverDataUrl
            ? { ...content, content: [{ type: 'image', attrs: { src: coverDataUrl, alt: null, title: null } }, ...(content.content ?? [])] }
            : content;
          setPagesContent(prev => {
            const next = [...prev];
            next[pageNum - 1] = pageContent;
            return next;
          });
        },
      );
      const pages = await injectCoverIntoPages(rawPages, coverBlob);
      await updateDocumentFull(id, userData.id, {
        title: documentTitle,
        pagesContent: JSON.stringify(pages),
        pdf: pendingFile,
        cover: coverBlob ?? undefined,
        originalPdf: pendingFile,
        originalPagesContent: JSON.stringify(pages),
      });
      setOriginalPages(pages);
      const clampedIndex = Math.min(Number(editingPageIndex), pages.length - 1);
      setPagesContent(pages);
      setEditingPageIndex(clampedIndex);
      setCurrentMargins(getMarginsFromPage(pages[clampedIndex]));
      setHasChanges(false);
      dispatch(invalidateContent());
    } catch (err) {
      console.error('Failed to import PDF:', err);
    } finally {
      setIsProcessingPdf(false);
      setPdfProgress(null);
      setPendingFile(null);
    }
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
    if (!documentTitle || pagesContent.length === 0 || !logged || !id) return;
    try {
      await updateDocumentContent(id, userData.id!, {
        title: documentTitle,
        pagesContent: JSON.stringify(pagesContent),
      });
      setHasChanges(false);
      setSaveStatus('saved');
      dispatch(invalidateContent());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save document:', err);
    }
  };

  const handleResetAll = () => {
    if (!originalPages) return;
    // Shallow-copy each page so every reference is new — React re-renders even
    // if pagesContent previously pointed to the same objects as originalPages.
    const fresh = originalPages.map(p => ({ ...p }));
    setPagesContent(fresh);
    setCurrentMargins(getMarginsFromPage(fresh[Number(editingPageIndex)] ?? fresh[0]));
    setHasChanges(true);
    setShowResetAllModal(false);
  };

  const handleResetPage = (index: number) => {
    if (!originalPages || !originalPages[index]) return;
    const updated = [...pagesContent];
    // Shallow-copy so the reference always changes, even on repeated resets of
    // the same page with no edits in between.
    updated[index] = { ...originalPages[index] };
    setPagesContent(updated);
    if (index === Number(editingPageIndex)) {
      setCurrentMargins(getMarginsFromPage(originalPages[index]));
    }
    setHasChanges(true);
  };

  if (isLoading) return <div className={s.container}><Spinner isLoading /></div>;
  if (error) return <div className={s.container}><div className={s.error}>{error}</div></div>;

  return (
    <div className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' onClick={() => navigate((location.state as { from?: string })?.from ?? `/document/${id}`)} />
        <span className={s.titleContainer}>
          <input
            className={s.documentTitle}
            type="text"
            placeholder={t.document.titlePlaceholder}
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
          />
        </span>

        {isProcessingPdf && processingCollapsed && (
          <PdfProcessingStatus
            variant="compact"
            progress={pdfProgress}
            coverUrl={coverUrl}
            documentTitle={documentTitle}
            onExpand={() => setProcessingCollapsed(false)}
          />
        )}
        {!isProcessingPdf && saveStatus === 'saving' && <span className={s.saveStatus}>{t.common.saving}</span>}
        {!isProcessingPdf && saveStatus === 'saved' && <span className={s.saveStatus}>{t.common.saved}</span>}

        <IconButton icon={faPaperclip} variant='transparent' disabled={isProcessingPdf} onClick={() => pdfInputRef.current?.click()} />
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
        {originalPages && <IconButton icon={faRotateLeft} variant='transparent' disabled={isProcessingPdf} onClick={() => setShowResetAllModal(true)} />}
        <IconButton icon={faSave} variant='transparent' disabled={!hasChanges || isProcessingPdf} onClick={handleSave} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' onClick={() => {}} />
        <IconButton icon={faGear} variant='transparent' onClick={() => dispatch(setShowEditorSettings(true))} />
      </div>

      <div className={s.editorContainer}>
        {isProcessingPdf && !processingCollapsed && (
          <PdfProcessingStatus
            variant="overlay"
            progress={pdfProgress}
            coverUrl={coverUrl}
            documentTitle={documentTitle}
            onCollapse={() => setProcessingCollapsed(true)}
          />
        )}
        <div className={s.editorWrapper}>
          <DocumentEditor
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
            pdfProgress={pdfProgress}
          />
        </div>
      </div>

      <CustomModal compact show={showImportModal} onClose={() => { setShowImportModal(false); setPendingFile(null); }} title={t.document.replaceContent}>
        <div className={s.importModalBody}>
          <p>{t.document.replaceContentDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => { setShowImportModal(false); setPendingFile(null); }}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleImportConfirm}>{t.common.replace}</PrimaryButton>
          </div>
        </div>
      </CustomModal>

      <CustomModal compact show={showResetAllModal} onClose={() => setShowResetAllModal(false)} title={t.document.resetAllTitle}>
        <div className={s.importModalBody}>
          <p>{t.document.resetAllDesc}</p>
          <div className={s.importModalActions}>
            <SecondaryButton onClick={() => setShowResetAllModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleResetAll}>{t.document.resetAll}</PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
