import s from './index.module.css';
import React, { useCallback, useState } from 'react';
import { faArrowAltCircleRight, faFileCircleCheck, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { resetDocumentState, setDocumentDetails } from 'store/documentSlice';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface UploadOptionProps {
  isLoading?: boolean;
}

export const UploadOption: React.FC<UploadOptionProps> = () => {
  const dispatch = useDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const { fileContent, title, size, totalPages } = useSelector((state: RootState) => state.document);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const fileContent = event.target?.result as string;

      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));

      pdfjsLib.getDocument({ data: pdfData }).promise.then(doc => {
        console.log(file)
        dispatch(setDocumentDetails({
          fileContent,
          title: file.name,
          size: file.size,
          totalPages: doc.numPages
        }));
      });
    };

    reader.readAsDataURL(file);
  }, [dispatch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    fileContent ? (
      <>
        <Link to="/document/create" className={s.pdfLink}>
          <div className={s.pdfInput}>
            <FontAwesomeIcon size="2x" icon={faFileCircleCheck} />
            <span>
              <p>{title}</p>
              <small>{formatBytes(size || 0)} - {totalPages} pages</small>
            </span>
            <span>
              <FontAwesomeIcon size="2x" icon={faArrowAltCircleRight} />
            </span>
          </div>
        </Link>
        <p onClick={() => dispatch(resetDocumentState())} className={s.resetPdf}>
          Or upload a new one
        </p>
      </>
    ) : (
      <div
        className={`${s.dropzone} ${isDragging ? s.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className={s.fileInput}
          id="file-input"
        />
        <label htmlFor='file-input' className={s.fileInputLabel}>
          <FontAwesomeIcon icon={faUpload} size="3x" />
          {'Drag and drop a PDF file here, or click to select a file'}
        </label>
      </div>
    )
  )
};
