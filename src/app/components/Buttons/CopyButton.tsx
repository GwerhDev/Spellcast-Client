import React from 'react';
import s from './CopyButton.module.css';
import { useDispatch } from 'react-redux';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

interface CopyButtonProps {
  title: string;
  textToCopy: string;
  children?: React.ReactNode;
}

const CopyButton: React.FC<CopyButtonProps> = ({ title, textToCopy, children }) => {
  const dispatch = useDispatch();

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        dispatch(addApiResponse({ message: 'Endpoint copied to clipboard!', type: 'success' }));
      })
      .catch(err => {
        dispatch(addApiResponse({ message: 'Failed to copy endpoint.', type: 'error' }));
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <button title={title} onClick={handleCopy} className={s.copyButton}>
      <FontAwesomeIcon icon={faCopy} />
      {children}
    </button>
  );
};

export default CopyButton;