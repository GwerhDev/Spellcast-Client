import React, { useState } from 'react';
import { PrimaryButton } from '../../Buttons/PrimaryButton';
import { LabeledInput } from '../../Inputs/LabeledInput';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setDocumentTitle } from '../../../../store/documentSlice';

interface CreateOptionProps {
  text?: string;
}

export const CreateOption: React.FC<CreateOptionProps> = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title for the document.');
      return;
    }
    dispatch(setDocumentTitle(title));
    navigate("/document/create");
  };

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <LabeledInput 
        label="Document title" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        name="document-title"
        id="document-title"
        htmlFor="document-title"
      />
      <PrimaryButton type="submit">
        Create new document
      </PrimaryButton>
    </form>
  );
};
