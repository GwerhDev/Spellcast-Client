import s from "./DocumentCreateInput.module.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { faArrowAltCircleRight, faFileCircleCheck, faFilePdf, faFileWord, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import { resetDocumentState, setDocumentTitle } from "store/documentSlice";
import { DocumentState } from "src/interfaces";
import { saveDocumentToDB } from "src/db";
import { useAppSelector } from "store/hooks";
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages } from 'src/utils/pdfUtils';
import { useLanguage } from '../../../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface DocumentCreateInputProps {
  document: DocumentState;
}

export const DocumentCreateInput = (props: DocumentCreateInputProps) => {
  const { document } = props;
  const [editTitle, setEditTitle] = useState(false);
  const { t } = useLanguage();
  const [isCreating, setIsCreating] = useState(false);

  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [saveOriginal, setSaveOriginal] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useAppSelector(state => state.session);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string | null | undefined) => {
    switch (type) {
      case "pdf": return faFilePdf;
      case "doc": return faFileWord;
      default: return faFileCircleCheck;
    }
  };

  const handleCreate = async () => {
    if (!document.fileContent) return;
    setIsCreating(true);
    try {
      const pdfData = atob(document.fileContent.substring(document.fileContent.indexOf(',') + 1));
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      const page1TextContent = await (await pdf.getPage(1)).getTextContent();
      const page1HasText = page1TextContent.items.some((item) => (item as { str: string }).str.trim().length > 0);
      const coverBlob = page1HasText ? null : await renderPageToCover(pdf);
      const rawPages = await extractPdfPages(pdf, (current, total) => setPdfProgress({ current, total }));
      const pagesContent = await injectCoverIntoPages(rawPages, coverBlob);

      const byteString = atob(document.fileContent.split(',')[1]);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      const id = await saveDocumentToDB({
        title: document.title,
        pdf: pdfBlob,
        originalPdf: saveOriginal ? pdfBlob : undefined,
        cover: coverBlob ?? undefined,
        userId: userData?.id,
        pagesContent: JSON.stringify(pagesContent),
        originalPagesContent: saveOriginal ? JSON.stringify(pagesContent) : undefined,
      });

      dispatch(resetDocumentState());
      navigate(`/document/${id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
      setIsCreating(false);
    }
  };

  const progressPct = pdfProgress
    ? Math.round((pdfProgress.current / pdfProgress.total) * 100)
    : isCreating ? 4 : 0;

  return (
    <div className={s.container}>
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(document.type)} />
      <div className={s.metadata} onMouseLeave={() => setEditTitle(false)}>
        <input
          placeholder={t.document.titleInputPlaceholder}
          readOnly={document.title.length > 0 && !editTitle}
          className={s.title}
          onClick={() => setEditTitle(true)}
          value={document.title}
          onChange={(e) => dispatch(setDocumentTitle(e.target.value))}
          type="text"
        />
        <div className={s.metaRow}>
          <small>
            {formatBytes(document.size || 0)}
            {document.totalPages > 0 && ` · ${document.totalPages} ${document.totalPages === 1 ? t.document.pageSingular : t.document.pagePlural}`}
          </small>
        </div>
        {isCreating && (
          <span className={s.progressText}>
            {pdfProgress
              ? `${t.document.processingPdf} ${pdfProgress.current} / ${pdfProgress.total}`
              : t.document.creating}
          </span>
        )}
      </div>
      <div className={s.actionCol}>
        {isCreating ? (
          <div className={s.creatingIndicator}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span>{progressPct}%</span>
          </div>
        ) : (
          <button
            onClick={handleCreate}
            className={s.continueButton}
          >
            <p>{t.editor.create}</p>
            <FontAwesomeIcon icon={faArrowAltCircleRight} size="2x" />
          </button>
        )}
        <div className={`${s.toggleGroup} ${isCreating ? s.toggleGroupDisabled : ''}`}>
          <span className={s.toggleLabel}>{t.common.saveOriginal}</span>
          <button
            type="button"
            role="switch"
            aria-checked={saveOriginal}
            disabled={isCreating}
            className={`${s.toggle} ${saveOriginal ? s.toggleOn : ''}`}
            onClick={() => setSaveOriginal(v => !v)}
          >
            <span className={`${s.toggleThumb} ${saveOriginal ? s.toggleThumbOn : ''}`} />
          </button>
        </div>
      </div>
      {isCreating && (
        <div className={s.progressBar} style={{ width: `${progressPct}%` } as React.CSSProperties} />
      )}
    </div>
  );
};
