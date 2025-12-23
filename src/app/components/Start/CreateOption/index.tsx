import React from 'react';
import { PrimaryButton } from '../../Buttons/PrimaryButton';
import { LabeledInput } from '../../Inputs/LabeledInput';
import { useNavigate } from 'react-router-dom';

interface CreateOptionProps {
  text?: string;
}

export const CreateOption: React.FC<CreateOptionProps> = () => {
  const navigate = useNavigate();

  const handleSubmit = () => {
    navigate("/document/create");
  };

  return (
    <form onSubmit={handleSubmit}>
      <LabeledInput label="Document title" value={""} name="" />
      <PrimaryButton type="submit">
        Create new document
      </PrimaryButton>
    </form>
  );
};
