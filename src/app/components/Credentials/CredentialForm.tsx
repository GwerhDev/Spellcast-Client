import { useState } from "react";
import { createCredential, updateCredential } from "../../../services/credentials";
import s from "./Credentials.module.css";

import { ActionButton } from "../Buttons/ActionButton";

export const CredentialForm = ({ credential, onClose }: { credential: any; onClose: () => void }) => {
  const [azureKey, setAzureKey] = useState(credential ? credential.azure_key : "");
  const [region, setRegion] = useState(credential ? credential.region : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { azure_key: azureKey, region };
    if (credential) {
      await updateCredential(credential.id, data);
    } else {
      await createCredential(data);
    }
    onClose();
  };

  return (
    <div className={s.formContainer}>
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
          <ActionButton text={credential ? "Update" : "Create"} type="submit" />
          <ActionButton text="Cancel" onClick={onClose} />
        </div>
      </form>
    </div>
  );
};
