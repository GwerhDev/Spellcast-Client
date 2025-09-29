import s from "./CredentialCard.module.css";
import { faEdit, faSave, faTrash, faTimes, faCommentDots } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../Buttons/IconButton";
import { TTS_Credential, Voice } from "src/interfaces";
import { LabeledInput } from "../Inputs/LabeledInput";
import { deleteCredential, createCredential, updateCredential } from "services/credentials";
import { updateSingleCredential } from "store/credentialsSlice";
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
  const [selectedVoices, setSelectedVoices] = useState<Voice[]>(credential.voices || []);
  const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  useEffect(() => {
    setKey(credential.azure_key || "");
    setRegion(credential.region || "");
    setEditionActive(credential.isNew ? true : false);
    setSelectedVoices(credential.voices || []);
  }, [credential]);

  const handleVoiceChange = (voiceId: string) => {
    const voiceToAdd = availableVoices.find(voice => voice.value === voiceId);
    if (!voiceToAdd) return;

    setSelectedVoices(prevSelectedVoices =>
      prevSelectedVoices.some(voice => voice.value === voiceId)
        ? prevSelectedVoices.filter(voice => voice.value !== voiceId)
        : [...prevSelectedVoices, voiceToAdd]
    );
  };

  const handleSave = async () => {
    if (credential.isNew) {
      await createCredential({ azure_key: key, region: region });
      if (onSaveNew) onSaveNew();
    } else {
      const updatedCred = await updateCredential(credential.id!, { azure_key: key, region: region, voices: selectedVoices });
      dispatch(updateSingleCredential(updatedCred));
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
        setSelectedVoices(credential.voices);
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
      setVoiceModalOpen(true);
      setIsLoadingVoices(true);
      try {
        const voices = await getVoicesByCredential(credential.id);
        setAvailableVoices(voices);
      } catch (error) {
        console.error("Failed to fetch voices", error);
      } finally {
        setIsLoadingVoices(false);
      }
    }
  };

  const handleCloseVoiceSelector = () => {
    setVoiceModalOpen(false);
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
        onClose={handleCloseVoiceSelector}
        voices={availableVoices}
        selectedVoices={selectedVoices.map(voice => voice.value)}
        onVoiceChange={handleVoiceChange}
        isLoading={isLoadingVoices}
      />
    </li>
  )
}