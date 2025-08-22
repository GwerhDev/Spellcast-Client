import s from './PdfInput.module.css';
import React from 'react';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface PdfInputProps {
  file: File | null;
  setFile: (file: File | null) => void;
  isLoading: boolean;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const PdfInput: React.FC<PdfInputProps> = ({
  file,
  isLoading,
  isDragging,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  return (
    !file &&
    < div
      className={`${s.dropzone} ${isDragging ? s.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isLoading}
        className={s.fileInput}
        id="file-input"
      />
      <label htmlFor='file-input' className={s.fileInputLabel}>
        <FontAwesomeIcon icon={faUpload} size="3x" />
        {'Drag and drop a PDF file here, or click to select a file'}
      </label>
    </div>
  );
};
