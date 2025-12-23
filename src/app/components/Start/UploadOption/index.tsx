import s from './index.module.css';
import React, { useCallback, useState } from 'react';
import { faArrowAltCircleRight, faFileCircleCheck, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPdfFile, resetPdfState } from '../../../../store/pdfReaderSlice';
import { RootState } from 'store/index';


interface UploadOptionProps {
  isLoading?: boolean;
}

export const UploadOption: React.FC<UploadOptionProps> = () => {
  const dispatch = useDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const fileContent = useSelector((state: RootState) => state.pdfReader.fileContent);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    console.log(reader)
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      dispatch(setPdfFile(base64));
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

    fileContent ? (
      <>
        <Link to="/document/create" className={s.pdfLink}>
          <div className={s.pdfInput}>
            <FontAwesomeIcon size="2x" icon={faFileCircleCheck} />
            <span>
              <p>A PDF is already loaded</p>
              <small>Continue creating</small>
              <p></p>
            </span>
            <span>
              <FontAwesomeIcon size="2x" icon={faArrowAltCircleRight} />
            </span>
          </div>
        </Link>
        <p onClick={() => dispatch(resetPdfState())} className={s.resetPdf}>
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
