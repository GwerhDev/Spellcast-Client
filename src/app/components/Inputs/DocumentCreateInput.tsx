import s from "./DocumentCreateInput.module.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { faArrowAltCircleRight, faFileCircleCheck, faFilePdf, faFileWord } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import { resetDocumentState, setDocumentTitle } from "store/documentSlice";
import { DocumentState } from "src/interfaces";
import { saveDocumentToDB } from "src/db";
import { useAppSelector } from "store/hooks";
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { renderPageToCover, extractPdfPages, injectCoverIntoPages } from 'src/utils/pdfUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface DocumentCreateInputProps {
  document: DocumentState;
}

export const DocumentCreateInput = (props: DocumentCreateInputProps) => {
  const { document } = props;
  const [editTitle, setEditTitle] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
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

      const [coverBlob, rawPages] = await Promise.all([
        renderPageToCover(pdf),
        extractPdfPages(pdf),
      ]);
      const pagesContent = await injectCoverIntoPages(rawPages, coverBlob);

      const byteString = atob(document.fileContent.split(',')[1]);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      const id = await saveDocumentToDB({
        title: document.title,
        pdf: pdfBlob,
        cover: coverBlob ?? undefined,
        userId: userData?.id,
        pagesContent: JSON.stringify(pagesContent),
      });

      dispatch(resetDocumentState());
      navigate(`/document/${id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
      setIsCreating(false);
    }
  };

  return (
    <div className={s.container}>
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(document.type)} />
      <div className={s.metadata} onMouseLeave={() => setEditTitle(false)}>
        <input
          placeholder="Please, provide a Title for your Document"
          readOnly={document.title.length > 0 && !editTitle}
          className={s.title}
          onClick={() => setEditTitle(true)}
          value={document.title}
          onChange={(e) => dispatch(setDocumentTitle(e.target.value))}
          type="text"
        />
        <small>{formatBytes(document.size || 0)}{document.totalPages > 0 && ` - ${document.totalPages} pages`}</small>
      </div>
      <button
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
        onClick={handleCreate}
        className={s.continueButton}
        disabled={isCreating}
      >
        {buttonHovered && <p>{isCreating ? 'Creating...' : 'Create'}</p>}
        <FontAwesomeIcon size="3x" icon={faArrowAltCircleRight} />
      </button>
    </div>
  );
};
