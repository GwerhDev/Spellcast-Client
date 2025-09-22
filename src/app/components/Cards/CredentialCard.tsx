import s from "./CredentialCard.module.css";
import { faEdit, faSave, faTrash, faTimes, faCommentDots } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../Buttons/IconButton";
import { TTS_Credential, Voice } from "src/interfaces";
import { LabeledInput } from "../Inputs/LabeledInput";
import { deleteCredential, createCredential, updateCredential } from "services/credentials";
import { getVoicesByCredential } from "services/tts";
import { useState, useEffect } from "react";
import { VoiceCheckboxModal } from "../Modals/VoiceCheckboxModal";

interface CredentialCardProps {
  credential: TTS_Credential;
  fetchCredentials: () => void;
  onSaveNew?: () => void;
  onCancelNew?: () => void;
}

export const CredentialCard = (props: CredentialCardProps) => {
  const { credential, fetchCredentials, onSaveNew, onCancelNew } = props;
  const [editionActive, setEditionActive] = useState(credential.isNew ? true : false);
  const [key, setKey] = useState(credential.azure_key || "");
  const [region, setRegion] = useState(credential.region || "");
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoices, setSelectedVoices] = useState<string[]>([]);
  const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);

  useEffect(() => {
    setKey(credential.azure_key || "");
    setRegion(credential.region || "");
    setEditionActive(credential.isNew ? true : false);
    if (credential.voices) {
      setSelectedVoices(credential.voices.map(voice => voice.value));
    }
  }, [credential]);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoices(prevSelectedVoices =>
      prevSelectedVoices.includes(voiceId)
        ? prevSelectedVoices.filter(id => id !== voiceId)
        : [...prevSelectedVoices, voiceId]
    );
  };

  const handleSave = async () => {
    if (credential.isNew) {
      await createCredential({ azure_key: key, region: region });
      if (onSaveNew) onSaveNew();
    } else {
      await updateCredential(credential.id!, { azure_key: key, region: region, voices: selectedVoices });
      fetchCredentials();
    }
    setEditionActive(false);
  };

  const handleCancel = () => {
    setVoiceModalOpen(false);
    if (credential.isNew) {
      if (onCancelNew) onCancelNew();
    } else {
      setKey(credential.azure_key || "");
      setRegion(credential.region || "");
      setEditionActive(false);
      if (credential.voices) {
        setSelectedVoices(credential.voices.map(voice => voice.value));
      } else {
        setSelectedVoices([]);
      }
    }
  };

  const handleEdit = () => {
    setEditionActive(true);
  };

  const handleDelete = async (credentialId: string | undefined) => {
    if (credential.isNew) {
      if (onCancelNew) onCancelNew();
    } else {
      await deleteCredential(credentialId);
      fetchCredentials();
    }
  };

  const handleOpenVoiceSelector = async () => {
    if (credential.id) {
      const voices = await getVoicesByCredential(credential.id);
      setAvailableVoices(voices);
      setVoiceModalOpen(true);
    }
  };

  return (
    <li key={credential.id} className={s.container}>
      <LabeledInput disabled={!editionActive} label={"key"} value={key} type="text" placeholder="Key" name="credential_key" id="credential_key" htmlFor="credential_key" onChange={(e) => setKey(e.target.value)} />
      <LabeledInput disabled={!editionActive} label={"region"} value={region} type="text" placeholder="Region" name="credential_region" id="credential_region" htmlFor="credential_region" onChange={(e) => setRegion(e.target.value)} />

      <div className={s.actions}>
        <IconButton variant="transparent" icon={faCommentDots} onClick={handleOpenVoiceSelector} />

        {
          editionActive ?
            <IconButton variant="transparent" icon={faSave} onClick={() => handleSave()} />
            :
            <IconButton variant="transparent" icon={faEdit} onClick={() => handleEdit()} />
        }
        {
          credential.isNew || editionActive ? (
            <IconButton variant="transparent" icon={faTimes} onClick={() => handleCancel()} />
          ) : (
            <IconButton variant="transparent" icon={faTrash} onClick={() => handleDelete(credential.id)} />
          )
        }
      </div>
      <VoiceCheckboxModal
        credentialId={credential.id}
        show={isVoiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        voices={availableVoices}
        selectedVoices={selectedVoices}
        onVoiceChange={handleVoiceChange}
      />
    </li>
  )
}