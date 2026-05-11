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

  const base64ToBlob = (dataUrl: string): Blob => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
    const byteString = atob(data);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([byteArray], { type: mimeType });
  };

  const handleCreate = async () => {
    if (!document.fileContent || !document.title) return;
    setIsCreating(true);
    try {
      const pdf = base64ToBlob(document.fileContent);
      const id = await saveDocumentToDB({ title: document.title, pdf, userId: userData?.id });
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
