import s from "./CredentialForm.module.css";
import { useState, useEffect } from "react";
import { createCredential, updateCredential } from "../../../services/credentials";
import { ActionButton } from "../Buttons/ActionButton";
import { TTS_Credential } from "src/interfaces";
import { faCancel, faSave } from "@fortawesome/free-solid-svg-icons";

interface CredentialFormProps {
    credential: TTS_Credential | null;
    onClose: () => void;
}

export const CredentialForm = ({ credential, onClose }: CredentialFormProps) => {
  const [azureKey, setAzureKey] = useState("");
  const [region, setRegion] = useState("");

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
          Azure Key:
          <input type="text" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} />
        </label>
        <label>
          Region:
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} />
        </label>
        <div className={s.formActions}>
          <ActionButton icon={faSave} text={credential ? "Update" : "Create"} type="submit" />
          <ActionButton icon={faCancel} text="Cancel" onClick={onClose} type="button" />
        </div>
      </form>
    </div>
  );
};