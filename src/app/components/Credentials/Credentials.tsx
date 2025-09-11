import s from "./Credentials.module.css";
import { useEffect, useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TTS_Credential } from "../../../interfaces";
import { getCredentials } from "../../../services/credentials";
import { CredentialCard } from "../Cards/CredentialCard";
import { Spinner } from "../Spinner";

export const Credentials = () => {
  const [loader, setLoader] = useState(true);
  const [credentials, setCredentials] = useState<TTS_Credential[]>([]);
  const [isAddingNewCredential, setIsAddingNewCredential] = useState(false);

  const fetchCredentials = async () => {
    setLoader(true);
    const data = await getCredentials();
    setCredentials(data);
    setLoader(false);
  };

  const handleAdd = () => {
    setIsAddingNewCredential(true);
  };

  const handleSaveNewCredential = () => {
    setIsAddingNewCredential(false);
    fetchCredentials(); // Re-fetch to show the newly saved credential
  };

  const handleCancelNewCredential = () => {
    setIsAddingNewCredential(false);
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  return (
    <div className={s.container}>
      <h1>Credentials</h1>
      <ul className={s.list}>
        {credentials.map((credential: TTS_Credential) => (
          <CredentialCard fetchCredentials={fetchCredentials} credential={credential} key={credential.id || `existing-${credential.region}-${credential.azure_key}`} />
        ))}
        {
          isAddingNewCredential ? (
            <CredentialCard
              credential={{ region: "", azure_key: "", isNew: true }}
              fetchCredentials={fetchCredentials}
              onSaveNew={handleSaveNewCredential}
              onCancelNew={handleCancelNewCredential}
            />
          ) : (
            <>
              {
                !loader &&
                <li className={s.emptyItem} onClick={handleAdd}>
                  <FontAwesomeIcon icon={faPlus} />
                  Create new credential
                </li>
              }
            </>
          )
        }
      </ul>
      {
        loader && !credentials.length && !isAddingNewCredential && <Spinner isLoading={loader} />
      }
    </div>
  );
};
