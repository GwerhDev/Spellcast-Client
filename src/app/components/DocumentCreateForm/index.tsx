import s from './index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from 'store';
import * as pdfjsLib from 'pdfjs-dist';
import { PageList } from './PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import jsPDF from 'jspdf';
import { saveDocumentToDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import type { TTSPlayPayload } from '../../../magictext';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { faArrowLeft, faCloudUpload, faPaperclip, faSave } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';
import { resetDocumentState, setDocumentDetails, setDocumentTitle as setDocumentTitleAction } from 'store/documentSlice';
import { resetPdfReader } from 'store/pdfReaderSlice';
import { textToSpeechService } from '../../../services/tts';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages, emptyPageContent } from '../../../utils/pdfUtils';
import { useLanguage } from '../../../i18n';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = emptyPageContent;

export const DocumentCreateForm: React.FC = () => {
  const document = useSelector((state: RootState) => state.document);
  const { userData, logged } = useAppSelector((state: RootState) => state.session);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const [documentTitle, setDocumentTitle] = useState(document.title || '');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [cover, setCover] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const credentials = useAppSelector((state) => state.credentials.credentials);
  const aiVoices = credentials[0]?.voices ?? [];
  const ttsMarks = aiVoices.map((v) => ({ id: v.value, name: v.name, voices: [v.value] }));

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

  const handlePdfImport = (file: File) => {
    const parts = file.type.split('/');
    const fileType = parts[parts.length - 1];
    const fileName = file.name.split('.').filter((e) => e !== fileType).join(' ');
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;
      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));
      pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
        dispatch(setDocumentDetails({ fileContent, size: file.size, type: fileType, title: fileName, totalPages: doc.numPages }));
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (document.title) {
      setDocumentTitle(document.title);
    }
  }, [document.title]);

  useEffect(() => {
    const extractTextFromPdf = async () => {
      if (!document.fileContent) {
        setPagesContent([emptyContent]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPdfProgress(null);
        const pdfData = atob(document.fileContent.substring(document.fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        const [coverBlob, rawPages] = await Promise.all([
          renderPageToCover(pdf),
          extractPdfPages(pdf, (current, total) => setPdfProgress({ current, total })),
        ]);
        const allPagesContent = await injectCoverIntoPages(rawPages, coverBlob);
        setCover(coverBlob);
        setPagesContent(allPagesContent);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
          setPdfProgress(null);
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [document.fileContent]);

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

  const handleSaveLocal = async () => {
    if (!documentTitle || pagesContent.length === 0) {
      alert('Please provide a title and have at least one page of content.');
      return;
    }

    if (!logged) {
      alert('You must be logged in to save a document.');
      return;
    }

    setIsSaving(true);
    try {
      const pdf = new jsPDF();
      const margin = 1;
      const startY = 1;
      const lineHeight = 1;

      pagesContent.forEach((pageContent, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        
        const plainText = pageContent.content?.map(node => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map(item => 'text' in item ? item.text : '').join('');
          }
          return '';
        }).join('\n') || '';

        const lines = pdf.splitTextToSize(plainText, pdf.internal.pageSize.width - margin * 2);
        
        let y = startY;
        const pageHeight = pdf.internal.pageSize.height;

        for (const line of lines) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = startY;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        }
      });

      const pdfBlob = pdf.output('blob');

      const newId = await saveDocumentToDB({
        title: documentTitle,
        pdf: pdfBlob,
        cover: cover ?? undefined,
        userId: userData.id,
        pagesContent: JSON.stringify(pagesContent),
      });

      dispatch(resetPdfReader());
      dispatch(resetDocumentState());
      navigate(`/document/${newId}`);

    } catch (error) {
      console.error('Failed to save document locally:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant='transparent' onClick={() => navigate(-1)} />
        <span className={s.titleContainer}>
          <input
            className={s.documentTitle}
            type="text"
            placeholder={t.document.titlePlaceholder}
            value={documentTitle}
            onChange={(e) => {
              setDocumentTitle(e.target.value);
              dispatch(setDocumentTitleAction(e.target.value));
            }}
          />
        </span>
        {isSaving && <span className={s.saveStatus}>{t.common.saving}</span>}
        <IconButton icon={faPaperclip} variant='transparent' onClick={() => pdfInputRef.current?.click()} />
        <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handlePdfImport(e.target.files[0]); }} />
        <IconButton icon={faSave} variant='transparent' disabled={isSaving || !documentTitle} onClick={handleSaveLocal} />
        <IconButton icon={faCloudUpload} disabled variant='transparent' onClick={() => {}} />
      </div>

      <div className={s.editorContainer}>
        <div className={s.editorWrapper}>
          <DocumentEditor
            pageNumber={editingPageIndex + 1}
            pageContent={pagesContent[editingPageIndex]}
            onPageContentChange={handlePageContentChange}
            ttsMarks={ttsMarks}
            onTTSPlay={handleTTSPlay}
            onTTSStop={stopTTSPreview}
            ttsPlaying={ttsPlaying}
          />
          {isLoading && (
            <div className={s.processingOverlay}>
              <div className={s.processingCard}>
                <span className={s.processingLabel}>
                  {pdfProgress
                    ? `${t.document.processingPdf} (${pdfProgress.current}/${pdfProgress.total})`
                    : t.document.processingPdf}
                </span>
                <div className={s.progressTrack}>
                  <div
                    className={s.progressFill}
                    style={{
                      width: pdfProgress
                        ? `${(pdfProgress.current / pdfProgress.total) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
};
