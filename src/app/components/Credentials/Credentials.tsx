import { useEffect, useState } from "react";
import { deleteCredential, getCredentials } from "../../../services/credentials";
import { CredentialForm } from "./CredentialForm";
import s from "./Credentials.module.css";

import { ActionButton } from "../Buttons/ActionButton";

export const Credentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);

  const fetchCredentials = async () => {
    const data = await getCredentials();
    setCredentials(data);
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleAdd = () => {
    setSelectedCredential(null);
    setShowForm(true);
  };

  const handleEdit = (credential: any) => {
    setSelectedCredential(credential);
    setShowForm(true);
  };

  const handleDelete = async (credentialId: string) => {
    await deleteCredential(credentialId);
    fetchCredentials();
  };

  const handleFormClose = () => {
    setShowForm(false);
    fetchCredentials();
  }

  return (
    <div className={s.container}>
      <h2>Credentials</h2>
      <ActionButton text="Add Credential" onClick={handleAdd} />
      {showForm && (
        <CredentialForm
          credential={selectedCredential}
          onClose={handleFormClose}
        />
      )}
      <ul className={s.list}>
        {credentials.map((credential: any) => (
          <li key={credential.id} className={s.listItem}>
            <span>{credential.azure_key}</span>
            <span>{credential.region}</span>
            <div className={s.actions}>
              <ActionButton text="Edit" onClick={() => handleEdit(credential)} />
              <ActionButton text="Delete" onClick={() => handleDelete(credential.id)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
