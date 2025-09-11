import s from "./Credentials.module.css";
import { useEffect, useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TTS_Credential } from "../../../interfaces";
import { deleteCredential, getCredentials } from "../../../services/credentials";
import { IconButton } from "../Buttons/IconButton";
import { CredentialCard } from "../Cards/CredentialCard";
import { CredentialForm } from "../Forms/CredentialForm";
import { Spinner } from "../Spinner";

export const Credentials = () => {
  const [loader, setLoader] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState<TTS_Credential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<TTS_Credential | null>(null);

  const fetchCredentials = async () => {
    setLoader(true);
    const data = await getCredentials();
    setCredentials(data);
    setLoader(false);
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
  };

  return (
    <div className={s.container}>
      <h1>Credentials</h1>
      {
        credentials.length
          ?
          <ul className={s.list}>
            {credentials.map((credential: TTS_Credential) => (
              <CredentialCard handleDelete={handleDelete} handleEdit={handleEdit} credential={credential} key={credential.id} />
            ))}
            <li className={s.emptyItem} onClick={handleAdd}>
              <FontAwesomeIcon icon={faPlus} />
              Create new credential
            </li>
          </ul>
          :
          <>
            {
              loader ? <Spinner isLoading={loader} /> : <IconButton icon={faPlus} text="Add Credential" onClick={handleAdd} />
            }
          </>
      }
      {showForm && (
        <CredentialForm
          credential={selectedCredential}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};
