import s from "./Credentials.module.css";
import { useEffect, useState } from "react";
import { deleteCredential, getCredentials } from "../../../services/credentials";
import { CredentialForm } from "../Forms/CredentialForm";
import { TTS_Credential } from "src/interfaces";
import { IconButton } from "../Buttons/IconButton";
import { faEdit, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Credentials = () => {
  const [credentials, setCredentials] = useState<TTS_Credential[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<TTS_Credential | null>(null);

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

  const handleEdit = (credential: TTS_Credential) => {
    setSelectedCredential(credential);
    setShowForm(true);
  };

  const handleDelete = async (credentialId: string | undefined) => {
    await deleteCredential(credentialId);
    fetchCredentials();
  };

  const handleFormClose = () => {
    setShowForm(false);
    fetchCredentials();
  }

  return (
    <div className={s.container}>
      {
        !credentials.length &&
        <div className={s.header}>
          <h1>Credentials</h1>
          <IconButton icon={faPlus} text="Add Credential" onClick={handleAdd} />
        </div>
      }

      {showForm && (
        <CredentialForm
          credential={selectedCredential}
          onClose={handleFormClose}
        />
      )}
      {
        credentials.length > 0 &&
        <>
          <div className={s.header}>
            <h1>Credentials</h1>
          </div>
          <ul className={s.list}>
            {credentials.map((credential: TTS_Credential) => (
              <li key={credential.id} className={s.listItem}>
                <span>{credential.azure_key}</span>
                <span>{credential.region}</span>
                <div className={s.actions}>
                  <IconButton variant="transparent" icon={faEdit} onClick={() => handleEdit(credential)} />
                  <IconButton variant="transparent" icon={faTrash} onClick={() => handleDelete(credential.id)} />
                </div>
              </li>
            ))}
            <li className={s.emptyItem} onClick={handleAdd}>
              <FontAwesomeIcon icon={faPlus} />
              Create new credential
            </li>
          </ul>
        </>
      }
    </div>
  );
};
