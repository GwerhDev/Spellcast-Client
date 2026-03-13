import s from "./DocumentCard.module.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { faArrowAltCircleRight, faFileCircleCheck, faFilePdf, faFileWord } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from "react-redux";
import { setDocumentTitle } from "store/documentSlice";
import { DocumentState } from "src/interfaces";

interface DocumentCardProps {
  document: DocumentState,
};

export const DocumentCard = (props: DocumentCardProps) => {
  const { document } = props;
  const [editTitle, setEditTitle] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
      case "pdf":
        return faFilePdf;

      case "doc":
        return faFileWord;

      default:
        return faFileCircleCheck;
    }
  };

  return (
    <div className={s.container}>
      <FontAwesomeIcon size="2x" icon={getFileTypeIcon(document.type)} />
      <div className={s.metadata} onMouseLeave={() => setEditTitle(false)}>
        <input placeholder={"Please, provide a Title for your Document"} readOnly={document.title.length > 0 && !editTitle} className={s.title} onClick={() => setEditTitle(true)} value={document.title} onChange={(e) => dispatch(setDocumentTitle(e.target.value))} type="text" />
        <small>{formatBytes(document.size || 0)} {document.totalPages > 0 && ` - ${document.totalPages} pages` }</small>
      </div>
      <button onMouseEnter={() => setButtonHovered(true)} onMouseLeave={() => setButtonHovered(false)} onClick={() => navigate("/document/create")} className={s.continueButton}>
        {
          buttonHovered ?
            <p>
              Continue
            </p>
            : null
        }
        <FontAwesomeIcon size="3x" icon={faArrowAltCircleRight} />
      </button>
    </div>
  )
}
