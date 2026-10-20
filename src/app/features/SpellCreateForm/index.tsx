import s from '../../components/SpellCreateForm/index.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store';
import { selectCurrentCredential } from '../../../store/credentialsSlice';
import * as pdfjsLib from 'pdfjs-dist';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { PageList } from '../../components/SpellCreateForm/PageList';
import { PageListPlace } from '../../components/SpellCreateForm/PageListOverlay';
import { usePageListToggle } from '../../../hooks/usePageListToggle';
import { SpellEditor } from '../../components/Editors/SpellEditor';
import { isCoverPage } from '../../../utils/spellPage';
import { saveSpellToDB } from '../../../db';
import { setOriginalPdf } from '../../../db/originalPdfs';
import { useNavigate } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import type { TTSPlayPayload } from '../../../magictext';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { faArrowLeft, faCloudUpload, faFilePdf, faSave, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { PdfProcessingStatus } from '../../components/PdfProcessingStatus';
import { SpellMetadataFields } from '../../components/SpellMetadataFields';
import { IconButton } from '../../components/Buttons/IconButton';
import { resetSpellState, setSpellDetails, setSpellTitle as setSpellTitleAction } from '../../../store/spellSlice';
import { resetSpellReader } from '../../../store/spellReaderSlice';
import { textToSpeechService } from '../../../services/tts';
import { renderPageToCover, extractPdfPages, emptyPageContent, blobToDataUrl, extractPdfMetadata, downscaleImageBlob } from '../../../utils/pdfUtils';
import { useLanguage } from '../../../i18n';
import { useGoBack } from '../../../hooks/useGoBack';
import { useShowOriginalPdf } from '../../../hooks/useShowOriginalPdf';
import { parseDataUrl } from '../../../utils/spellImages';
import { CustomModal } from '../../components/Modals/CustomModal';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = emptyPageContent;

export const SpellCreateForm: React.FC = () => {
  const spell = useSelector((state: RootState) => state.spell);
  const { userData, logged } = useAppSelector((state: RootState) => state.session);
  const navigate = useNavigate();
  const goBack = useGoBack('/editor');
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const [spellTitle, setSpellTitle] = useState(spell.title || '');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // TCORE-122: mirrors whether pdfDocRef.current is set -- a ref alone wouldn't
  // trigger a re-render to show/hide the "use PDF page 1" cover action.
  const [hasImportedPdf, setHasImportedPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);
  // The page list, shown or hidden from the top bar (see PageListPlace).
  const pageList = usePageListToggle();
  // A page about to be deleted: asked first (its content would go).
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  // As in the editor: the page compared with the PDF's, and a page (or all of them) restored
  // as read from it -- asked first, the edits to it would go.
  const [showOriginal, setShowOriginal] = useShowOriginalPdf();
  const [pageToReset, setPageToReset] = useState<number | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const originalPdfRef = useRef<File | null>(null);
  const originalPagesRef = useRef<JSONContent[] | null>(null);
  // TCORE-122: kept only so the cover can be (re-)rendered from page 1 on demand (the
  // "use PDF page 1" cover action) without re-reading/re-parsing the imported PDF.
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  // TCORE-97: optional social/feed metadata, prefilled from the PDF's own Info/XMP
  // dictionary (see extractPdfMetadata) but always user-editable.
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [language, setLanguage] = useState('');
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  // Guards the PDF-preferred title against clobbering a title the user already typed by
  // hand in the (tiny, but real) window before extractPdfMetadata resolves.
  const titleEditedByUserRef = useRef(false);


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

  // The PDF being read, to compare the pages with: not stored until the spell is (see
  // handleSaveLocal), so it's the file itself.
  const pdfFile = useMemo(() => {
    const parsed = spell.fileContent ? parseDataUrl(spell.fileContent) : null;
    return parsed ? new Blob([parsed.bytes as BlobPart], { type: parsed.type }) : null;
  }, [spell.fileContent]);

  // The pages as read from the PDF, once read.
  const originals = originalPagesRef.current;
  const handleResetPage = (index: number) => {
    if (!originals?.[index]) return;
    const updated = [...pagesContent];
    updated[index] = { ...originals[index] };
    setPagesContent(updated);
  };
  const handleResetAll = () => {
    setShowResetAllModal(false);
    if (originals) setPagesContent(originals.map(page => ({ ...page })));
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
        pdfDocRef.current = null;
        setHasImportedPdf(false);
        setPagesContent([emptyContent]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPdfProgress(null);
        setCoverUrl(null);
        setProcessingCollapsed(false);
        titleEditedByUserRef.current = false;
        setDescription(''); setAuthor(''); setTagsInput(''); setLanguage(''); setMetadataExpanded(false);
        const pdfData = atob(spell.fileContent.substring(spell.fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        pdfDocRef.current = pdf;
        setHasImportedPdf(true);

        // Prefill (TCORE-97), right after obtaining `pdf` and before the heavier page
        // extraction below -- minimizes the window in which a user could type a custom
        // title before this resolves. Never authoritative: every field stays editable,
        // and the filename-derived title is only replaced if the user hasn't already
        // changed it by hand.
        const meta = await extractPdfMetadata(pdf);
        if (meta.title && !titleEditedByUserRef.current) {
          setSpellTitle(meta.title);
          dispatch(setSpellTitleAction(meta.title));
        }
        if (meta.description) setDescription(meta.description);
        if (meta.author) setAuthor(meta.author);
        if (meta.tags?.length) setTagsInput(meta.tags.join(', '));
        if (meta.language) setLanguage(meta.language);
        if (meta.description || meta.author || meta.tags?.length || meta.language) {
          setMetadataExpanded(true);
        }

        // The spell's cover: page 1 rendered as a thumbnail for the cards, shown (and
        // replaceable) in Additional details. Only the cover -- the pages are the PDF's as
        // read, page 1 too.
        const coverBlob = await renderPageToCover(pdf);
        const coverDataUrl = coverBlob ? await blobToDataUrl(coverBlob) : null;
        if (coverDataUrl) {
          setCoverUrl(coverDataUrl);
          setMetadataExpanded(true);
        }
        setCover(coverBlob);

        const initialPages = Array.from({ length: pdf.numPages }, () => emptyContent);
        setPagesContent(initialPages);

        const rawPages = await extractPdfPages(
          pdf,
          (current, total) => setPdfProgress({ current, total }),
          (pageNum, content) => {
            setPagesContent(prev => {
              const next = [...prev];
              next[pageNum - 1] = content;
              return next;
            });
          },
        );
        originalPagesRef.current = rawPages;
        setPagesContent(rawPages);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
          setPdfProgress(null);
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [spell.fileContent, dispatch]);

  const handlePageClick = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
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

  // A new cover: the spell's thumbnail only -- its pages stay as the PDF has them.
  const applyCover = async (blob: Blob) => {
    const dataUrl = await blobToDataUrl(blob);
    setCover(blob);
    setCoverUrl(dataUrl);
  };

  // Downscaled before it ever reaches applyCover -- an unprocessed upload can be several MB,
  // which would otherwise count fully against the spell's IndexedDB storage quota (TCORE-117)
  // for an image only ever shown at thumbnail size (review follow-up).
  const handleCoverUpload = (file: File) => { void downscaleImageBlob(file).then(applyCover); };

  const handleUseFirstPageCover = async () => {
    if (!pdfDocRef.current) return;
    const blob = await renderPageToCover(pdfDocRef.current);
    if (blob) void applyCover(blob);
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
      const trimmedTags = tagsInput.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      const newId = await saveSpellToDB({
        title: spellTitle,
        cover: cover ?? undefined,
        userId: userData.id,
        pagesContent: JSON.stringify(pagesContent),
        originalPagesContent: originalPagesRef.current ? JSON.stringify(originalPagesRef.current) : undefined,
        description: description || undefined,
        author: author || undefined,
        tags: trimmedTags.length ? trimmedTags : undefined,
        language: language || undefined,
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
      // On to keep working on it: the editor of the spell just made (replacing this page in
      // the history, so going back doesn't land on an empty create form).
      navigate(`/editor/${newId}`, { replace: true });

    } catch (error) {
      console.error('Failed to save spell locally:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-testid="spell-create-form" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' title={t.common.back} onClick={goBack} />
        <span className={s.titleContainer}>
          <input
            data-testid="spell-title-input"
            className={s.spellTitle}
            type="text"
            placeholder={t.spell.titlePlaceholder}
            value={spellTitle}
            onChange={(e) => {
              titleEditedByUserRef.current = true;
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
        {/* Importing a PDF is the PDF panel's own (see SpellEditor's pdfPanel): it opens this
            picker, as in the editor. */}
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handlePdfImport(e.target.files[0]); e.target.value = ''; }} />
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
          data-testid="spell-create-original-btn"
          icon={faFilePdf}
          variant='transparent'
          className={showOriginal ? s.headerBtnActive : undefined}
          title={t.spell.showOriginal}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal(v => !v)}
        />
        <IconButton data-testid="spell-create-save-btn" icon={faSave} variant='transparent' title={t.common.save} disabled={isSaving || !spellTitle} onClick={handleSaveLocal} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' title={t.nav.cloud} onClick={() => {}} />
      </div>

      <SpellMetadataFields
        expanded={metadataExpanded}
        onToggleExpanded={() => setMetadataExpanded((v) => !v)}
        coverUrl={coverUrl}
        onCoverUploadImage={handleCoverUpload}
        onCoverUseFirstPage={hasImportedPdf ? handleUseFirstPageCover : undefined}
        description={description}
        onDescriptionChange={setDescription}
        author={author}
        onAuthorChange={setAuthor}
        tagsInput={tagsInput}
        onTagsInputChange={setTagsInput}
        language={language}
        onLanguageChange={setLanguage}
      />

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
            onMarginsChange={isCoverPage(pagesContent[editingPageIndex], editingPageIndex) ? undefined : (m) => {
              const updated = [...pagesContent];
              const p = updated[editingPageIndex];
              updated[editingPageIndex] = { ...p, attrs: { ...(p?.attrs as object ?? {}), ...m } };
              setPagesContent(updated);
            }}
            ttsMarks={ttsMarks}
            onTTSPlay={handleTTSPlay}
            onTTSStop={stopTTSPreview}
            ttsPlaying={ttsPlaying}
            pdfPanel={showOriginal ? {
              pdf: pdfFile,
              hasOriginal: hasImportedPdf && !!pdfFile,
              busy: isLoading && hasImportedPdf,
              onReplacePdf: () => pdfInputRef.current?.click(),
              onRestoreAll: originals ? () => setShowResetAllModal(true) : undefined,
              onRestorePage: originals ? () => setPageToReset(editingPageIndex) : undefined,
            } : null}
          />
        </div>
        <PageListPlace toggle={pageList} className={s.pagesContainer}>
          {(overlay) => (
            <PageList
              pages={pagesContent.map(() => '')}
              currentPage={editingPageIndex}
              onPageClick={handlePageClick}
              onPageDelete={setPageToDelete}
              onAddPage={handleAddPage}
              onPageReset={originals ? setPageToReset : undefined}
              pdfProgress={pdfProgress}
              column={overlay}
            />
          )}
        </PageListPlace>
      </div>
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
        onConfirm={() => { const index = pageToReset; setPageToReset(null); if (index !== null) handleResetPage(index); }}
        title={t.spell.resetPage}
        message={t.spell.resetPageConfirm.replace('{n}', String((pageToReset ?? 0) + 1))}
        confirmText={t.spell.resetPage}
      />
      <CustomModal compact show={showResetAllModal} onClose={() => setShowResetAllModal(false)} title={t.spell.resetAllTitle}>
        <div className={s.modalBody}>
          <p>{t.spell.resetAllDesc}</p>
          <div className={s.modalActions}>
            <SecondaryButton onClick={() => setShowResetAllModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton onClick={handleResetAll}>{t.spell.resetAll}</PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
