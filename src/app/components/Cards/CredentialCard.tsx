import s from "./CredentialCard.module.css";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../Buttons/IconButton";
import { TTS_Credential } from "src/interfaces";

interface CredentialCardProps {
  credential: TTS_Credential;
  handleEdit: (credential: TTS_Credential) => void;
  handleDelete: (id: string | undefined) => void;
}

export const CredentialCard = (props: CredentialCardProps) => {
  const { credential, handleEdit, handleDelete } = props;

  return (
    <li key={credential.id} className={s.container}>
      <span>{credential.azure_key}</span>
      <small>{credential.region}</small>
      <div className={s.actions}>
        <IconButton variant="transparent" icon={faEdit} onClick={() => handleEdit(credential)} />
        <IconButton variant="transparent" icon={faTrash} onClick={() => handleDelete(credential.id)} />
      </div>
    </li>
  )
}
