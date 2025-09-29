import React, { useMemo, useState } from 'react';
import s from './VoiceCheckboxModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Voice } from 'src/interfaces';
import { updateCredential } from 'services/credentials';

interface VoiceCheckboxModalProps {
  voices: Voice[];
  selectedVoices: string[];
  onVoiceChange: (voiceId: string) => void;
  onClose: () => void;
  show: boolean;
  credentialId: string | undefined;
}

export const VoiceCheckboxModal: React.FC<VoiceCheckboxModalProps> = ({
  voices,
  selectedVoices,
  onVoiceChange,
  onClose,
  show,
  credentialId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredVoices = useMemo(() =>
    (voices || []).filter((voice) =>
      voice.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [voices, searchTerm]
  );

  const allFilteredSelected = useMemo(() =>
    filteredVoices.length > 0 &&
    filteredVoices.every((v) => selectedVoices.includes(v.value)),
    [filteredVoices, selectedVoices]
  );

  const handleSelectAllChange = () => {
    if (allFilteredSelected) {
      // Deselect all filtered voices
      filteredVoices.forEach((voice) => {
        if (selectedVoices.includes(voice.value)) {
          onVoiceChange(voice.value);
        }
      });
    } else {
      // Select all filtered voices
      filteredVoices.forEach((voice) => {
        if (!selectedVoices.includes(voice.value)) {
          onVoiceChange(voice.value);
        }
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCredential(credentialId, { voices: selectedVoices });
      onClose();
    } catch (error) {
      console.error('Failed to save voices:', error);
      // Optionally: show a toast notification to the user
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select Voices</h3>

        <input
          type="text"
          placeholder="Search voices..."
          className={s.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <span className={s.voiceOption} onClick={handleSelectAllChange}>
          <input
            type="checkbox"
            id="select-all"
            checked={allFilteredSelected}
            onChange={() => {
              /* Handled by onClick on li */
            }}
          />
          <p>Select/Deselect All</p>
        </span>

        <ul className={s.voiceList}>
          {filteredVoices.map((voice) => (
            <li
              key={voice.value}
              className={s.voiceOption}
              onClick={() => onVoiceChange(voice.value)}
            >
              <input
                type="checkbox"
                id={voice.value}
                checked={selectedVoices.includes(voice.value)}
                onChange={() => {
                  /* Handled by onClick on li */
                }}
              />
              <p>{voice.label}</p>
            </li>
          ))}
        </ul>

        <IconButton icon={faSave} onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </IconButton>
      </div>
    </div>
  );
};
