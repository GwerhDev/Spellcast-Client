import s from './NewVersionModal.module.css';
import { useState } from 'react';
import { CustomModal } from './CustomModal';
import { LabeledInput } from '../Inputs/LabeledInput';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';

interface NewVersionModalProps {
  show: boolean;
  // Names already taken.
  taken: string[];
  onClose: () => void;
  onCreate: (name: string) => void;
  labels: { title: string; name: string; placeholder: string; create: string; cancel: string; taken: string };
}

// Naming a new version (a line of work from where the current one is).
export const NewVersionModal = ({ show, taken, onClose, onCreate, labels }: NewVersionModalProps) => {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const isTaken = taken.includes(trimmed);
  const close = () => { setName(''); onClose(); };
  const create = () => {
    if (!trimmed || isTaken) return;
    setName('');
    onCreate(trimmed);
  };

  return (
    <CustomModal compact show={show} onClose={close} title={labels.title}>
      <form className={s.container} onSubmit={(e) => { e.preventDefault(); create(); }} data-testid="new-version-modal">
        <LabeledInput
          id="new-version-name"
          htmlFor="new-version-name"
          name="new-version-name"
          label={labels.name}
          placeholder={labels.placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {isTaken && <p className={s.error} data-testid="new-version-taken">{labels.taken}</p>}
        <div className={s.buttons}>
          <SecondaryButton type="button" onClick={close}>{labels.cancel}</SecondaryButton>
          <PrimaryButton data-testid="new-version-create" type="submit" disabled={!trimmed || isTaken}>{labels.create}</PrimaryButton>
        </div>
      </form>
    </CustomModal>
  );
};
