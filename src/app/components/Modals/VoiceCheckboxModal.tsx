import React, { useMemo, useState } from 'react';
import s from './VoiceCheckboxModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { Voice } from 'src/interfaces';
import { Spinner } from '../Spinner';
import { useAppDispatch } from 'store/hooks';
import { updateCredential } from 'store/credentialsSlice';
import { CustomModal } from './CustomModal';

interface VoiceCheckboxModalProps {
  voices: Voice[];
  selectedVoices: string[];
  onVoiceChange: (voiceId: string) => void;
  onClose: () => void;
  show: boolean;
  credentialId: string | undefined;
  isLoading: boolean;
}

export const VoiceCheckboxModal: React.FC<VoiceCheckboxModalProps> = ({
  voices,
  selectedVoices,
  onVoiceChange,
  onClose,
  show,
  credentialId,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useAppDispatch();

  const filteredVoices = (voices || []).filter(
    (voice: Voice) =>
      voice &&
      voice.label &&
      voice.label.toLowerCase().includes(searchTerm.toLowerCase())
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
      const fullVoices = voices.filter(voice => selectedVoices.includes(voice.value));
      await dispatch(updateCredential({ credentialId, data: { voices: fullVoices } }));
      onClose();
    } catch (error) {
      console.error('Failed to save voices:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <CustomModal title="Select Voices" show={show} onClose={onClose}>
      <div className={s.container}>
        {isLoading ? (
          <Spinner isLoading={isLoading} />
        ) : (
          <>
            <input
              type="text"
              placeholder="Search voices..."
              className={s.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className={s.voiceAllOption}>
              <input
                type="checkbox"
                id="select-all"
                checked={allFilteredSelected}
                onChange={handleSelectAllChange}
              />
              <small>Select/Deselect All</small>
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
          </>
        )}
      </div>
    </CustomModal>
  );
};
