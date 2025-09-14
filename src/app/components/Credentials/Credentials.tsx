import s from "./Credentials.module.css";
import { useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TTS_Credential } from "../../../interfaces";
import { CredentialCard } from "../Cards/CredentialCard";
import { Spinner } from "../Spinner";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "store";
import { getCredentials } from "store/credentialsSlice";

export const Credentials = () => {
  const dispatch: AppDispatch = useDispatch();
  const { credentials, loading } = useSelector((state: RootState) => state.credentials);
  const [isAddingNewCredential, setIsAddingNewCredential] = useState(false);

  const handleAdd = () => {
    setIsAddingNewCredential(true);
  };

  const handleSaveNewCredential = () => {
    setIsAddingNewCredential(false);
    dispatch(getCredentials());
  };

  const handleCancelNewCredential = () => {
    setIsAddingNewCredential(false);
  };

  return (
    <div className={s.container}>
      <h1>Credentials</h1>
      <ul className={s.list}>
        {credentials.map((credential: TTS_Credential) => (
          <CredentialCard fetchCredentials={() => dispatch(getCredentials())} credential={credential} key={credential.id || `existing-${credential.region}-${credential.azure_key}`} />
        ))}
        {
          isAddingNewCredential ? (
            <CredentialCard
              credential={{ region: "", azure_key: "", isNew: true }}
              fetchCredentials={() => dispatch(getCredentials())}
              onSaveNew={handleSaveNewCredential}
              onCancelNew={handleCancelNewCredential}
            />
          ) : (
            <>
              {
                !loading &&
                <li className={s.emptyItem} onClick={handleAdd}>
                  <FontAwesomeIcon icon={faPlus} />
                  Create new credential
                </li>
              }
            </>
          )
        }
        {
          loading && !credentials.length && !isAddingNewCredential && <Spinner isLoading={loading} />
        }
      </ul>
    </div>
  );
};
