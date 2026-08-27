import s from '../../components/SpellCreateForm/index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store';
import { selectCurrentCredential } from '../../../store/credentialsSlice';
import * as pdfjsLib from 'pdfjs-dist';
import { PageList } from '../../components/SpellCreateForm/PageList';
import { SpellEditor } from '../../components/Editors/SpellEditor';
import type { PageMargins } from '../../components/Editors/SpellEditor';
import { saveSpellToDB } from '../../../db';
import { setOriginalPdf } from '../../../db/originalPdfs';
import { useNavigate } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import type { TTSPlayPayload } from '../../../magictext';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { faArrowLeft, faCloudUpload, faPaperclip, faSave } from '@fortawesome/free-solid-svg-icons';
import { PdfProcessingStatus } from '../../components/PdfProcessingStatus';
import { IconButton } from '../../components/Buttons/IconButton';
import { resetSpellState, setSpellDetails, setSpellTitle as setSpellTitleAction } from '../../../store/spellSlice';
import { resetSpellReader } from '../../../store/spellReaderSlice';
import { textToSpeechService } from '../../../services/tts';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, emptyPageContent, blobToDataUrl } from '../../../utils/pdfUtils';
import { useLanguage } from '../../../i18n';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = emptyPageContent;

export const SpellCreateForm: React.FC = () => {
  const spell = useSelector((state: RootState) => state.spell);
  const { userData, logged } = useAppSelector((state: RootState) => state.session);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const [spellTitle, setSpellTitle] = useState(spell.title || '');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);
  const [currentMargins, setCurrentMargins] = useState<PageMargins>({ marginTop: 48, marginRight: 64, marginBottom: 48, marginLeft: 64 });
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const originalPdfRef = useRef<File | null>(null);
  const originalPagesRef = useRef<JSONContent[] | null>(null);

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

  const activeCredential = useAppSelector(selectCurrentCredential);
  const aiVoices = activeCredential?.voices ?? [];
  const ttsMarks = aiVoices.map((v) => ({ id: v.value, name: v.name, voices: [v.value] }));

  const [processingCollapsed, setProcessingCollapsed] = useState(false);
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

  const handlePdfImport = (file: File) => {
    originalPdfRef.current = file;
    originalPagesRef.current = null;
    const parts = file.type.split('/');
    const fileType = parts[parts.length - 1];
    const fileName = file.name.split('.').filter((e) => e !== fileType).join(' ');
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;
      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
      pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
        dispatch(setSpellDetails({ fileContent, size: file.size, type: fileType, title: fileName, totalPages: doc.numPages }));
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (spell.title) {
      setSpellTitle(spell.title);
    }
  }, [spell.title]);

  useEffect(() => {
    const extractTextFromPdf = async () => {
      if (!spell.fileContent) {
        setPagesContent([emptyContent]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPdfProgress(null);
        setCoverUrl(null);
        setProcessingCollapsed(false);
        const pdfData = atob(spell.fileContent.substring(spell.fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        const page1TextContent = await (await pdf.getPage(1)).getTextContent();
        const page1HasText = page1TextContent.items.some((item) => (item as { str: string }).str.trim().length > 0);
        const coverBlob = page1HasText ? null : await renderPageToCover(pdf);
        const coverDataUrl = coverBlob ? await blobToDataUrl(coverBlob) : null;
        if (coverDataUrl) setCoverUrl(coverDataUrl);
        setCover(coverBlob);

        const coverNode: JSONContent = coverDataUrl
          ? { type: 'image', attrs: { src: coverDataUrl, alt: null, title: null } }
          : emptyContent;
        const initialPages = Array.from({ length: pdf.numPages }, (_, i) =>
          i === 0 ? { type: 'doc', content: [coverNode] } as JSONContent : emptyContent
        );
        setPagesContent(initialPages);

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
        const allPagesContent = await injectCoverIntoPages(rawPages, coverBlob);
        originalPagesRef.current = allPagesContent;
        setPagesContent(allPagesContent);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
          setPdfProgress(null);
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [spell.fileContent]);

  const handlePageClick = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
    setCurrentMargins(getMarginsFromPage(pagesContent[pageIndex]));
  };

  const handlePageDelete = (pageIndex: number) => {
    setPagesContent(pagesContent.filter((_, index) => index !== pageIndex));
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updatedPagesContent = [...pagesContent];
    updatedPagesContent[editingPageIndex] = newContent;
    setPagesContent(updatedPagesContent);
  };

  const handleSaveLocal = async () => {
    if (!spellTitle || pagesContent.length === 0) {
      alert('Please provide a title and have at least one page of content.');
      return;
    }

    if (!logged) {
      alert('You must be logged in to save a document.');
      return;
    }

    setIsSaving(true);
    try {
      const newId = await saveSpellToDB({
        title: spellTitle,
        cover: cover ?? undefined,
        userId: userData.id,
        pagesContent: JSON.stringify(pagesContent),
        originalPagesContent: originalPagesRef.current ? JSON.stringify(originalPagesRef.current) : undefined,
      });

      // Only the real, user-imported PDF (if any) is worth keeping -- it's an ingestion
      // input, not part of the spell's content (TCORE-90), so it lives in its own store,
      // never on the spell record. There is no reason to synthesize and store a PDF
      // rendering of the typed/edited content itself: nothing reads it back.
      if (originalPdfRef.current) {
        await setOriginalPdf(newId, originalPdfRef.current);
      }

      dispatch(resetSpellReader());
      dispatch(resetSpellState());
      navigate(`/spell/${newId}`);

    } catch (error) {
      console.error('Failed to save document locally:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-testid="spell-create-form" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' title={t.common.back} onClick={() => navigate(-1)} />
        <span className={s.titleContainer}>
          <input
            data-testid="spell-title-input"
            className={s.spellTitle}
            type="text"
            placeholder={t.spell.titlePlaceholder}
            value={spellTitle}
            onChange={(e) => {
              setSpellTitle(e.target.value);
              dispatch(setSpellTitleAction(e.target.value));
            }}
          />
        </span>
        {isLoading && pdfProgress && processingCollapsed && (
          <PdfProcessingStatus
            variant="compact"
            progress={pdfProgress}
            coverUrl={coverUrl}
            spellTitle={spellTitle}
            onExpand={() => setProcessingCollapsed(false)}
          />
        )}
        {isSaving && <span className={s.saveStatus}>{t.common.saving}</span>}
        <IconButton icon={faPaperclip} variant='transparent' title={t.spell.importPdf} onClick={() => pdfInputRef.current?.click()} />
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handlePdfImport(e.target.files[0]); }} />
        <IconButton data-testid="spell-create-save-btn" icon={faSave} variant='transparent' title={t.common.save} disabled={isSaving || !spellTitle} onClick={handleSaveLocal} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' title={t.nav.cloud} onClick={() => {}} />
      </div>

      <div className={s.editorContainer}>
        {isLoading && pdfProgress && !processingCollapsed && (
          <PdfProcessingStatus
            variant="overlay"
            progress={pdfProgress}
            coverUrl={coverUrl}
            spellTitle={spellTitle}
            onCollapse={() => setProcessingCollapsed(true)}
          />
        )}
        <div className={s.editorWrapper}>
          <SpellEditor
            pageNumber={editingPageIndex + 1}
            pageContent={pagesContent[editingPageIndex]}
            onPageContentChange={handlePageContentChange}
            margins={currentMargins}
            onMarginsChange={isCoverPage(pagesContent[editingPageIndex]) ? undefined : (m) => {
              setCurrentMargins(m);
              const updated = [...pagesContent];
              const p = updated[editingPageIndex];
              updated[editingPageIndex] = { ...p, attrs: { ...(p?.attrs as object ?? {}), ...m } };
              setPagesContent(updated);
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
            currentPage={editingPageIndex}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
            pdfProgress={pdfProgress}
          />
        </div>
      </div>
    </div>
  );
};
