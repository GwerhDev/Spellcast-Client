import s from "./CredentialForm.module.css";
import { useState, useEffect } from "react";
import { createCredential, updateCredential } from "../../../services/credentials";
import { ActionButton } from "../Buttons/ActionButton";
import { TTS_Credential } from "src/interfaces";
import { faCancel, faSave } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from '../../../i18n';

interface CredentialFormProps {
    credential: TTS_Credential | null;
    onClose: () => void;
};

export const CredentialForm = ({ credential, onClose }: CredentialFormProps) => {
  const [azureKey, setAzureKey] = useState("");
  const [region, setRegion] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    if (credential) {
        setAzureKey(credential.azure_key || '');
        setRegion(credential.region);
    } else {
        setAzureKey("");
        setRegion("");
    }
  }, [credential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { azure_key: azureKey, region };
    if (credential && credential.id) {
      await updateCredential(credential.id, data);
    } else {
      await createCredential(data);
    }
    onClose();
  };

  return (
    <div className={s.container}>
      <form onSubmit={handleSubmit} className={s.form}>
        <label>
          {t.credentials.azureKeyLabel}:
          <input type="text" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} />
        </label>
        <label>
          {t.credentials.regionLabel}:
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} />
        </label>
        <div className={s.formActions}>
          <ActionButton icon={faSave} text={credential ? t.common.update : t.editor.create} type="submit" />
          <ActionButton icon={faCancel} text={t.common.cancel} onClick={onClose} type="button" />
        </div>
      </form>
    </div>
  );
};