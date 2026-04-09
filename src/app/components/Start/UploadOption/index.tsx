import s from './index.module.css';
import React, { useCallback, useState } from 'react';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { resetDocumentState, setDocumentDetails } from 'store/documentSlice';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { DocumentCreateInput } from '../../Inputs/DocumentCreateInput';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface UploadOptionProps {
  isLoading?: boolean;
}

export const UploadOption: React.FC<UploadOptionProps> = () => {
  const document = useSelector((state: RootState) => state.document);
  const [isDragging, setIsDragging] = useState(false);
  const dispatch = useDispatch();

  const handleFile = useCallback((file: File) => {
    const fileType = file.type.split("/")?.at(-1);
    const fileName = file.name.split(".").filter((e) => e !== fileType).join(" ");

    const reader = new FileReader();

    reader.onload = function (event) {
      const fileContent = event.target?.result as string;

      const pdfData = atob(fileContent.substring(fileContent.indexOf(',') + 1));

      pdfjsLib.getDocument({ data: pdfData }).promise.then(doc => {
        dispatch(setDocumentDetails({
          fileContent,
          size: file.size,
          type: fileType,
          title: fileName,
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

  return (
    document.fileContent ? (
      <>
        <DocumentCreateInput document={document} />
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
