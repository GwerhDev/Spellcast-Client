import s from "./CredentialCard.module.css";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../Buttons/IconButton";
import { TTS_Credential } from "src/interfaces";
import { LabeledInput } from "../Inputs/LabeledInput";

interface CredentialCardProps {
  credential: TTS_Credential;
  handleEdit: (credential: TTS_Credential) => void;
  handleDelete: (id: string | undefined) => void;
}

export const CredentialCard = (props: CredentialCardProps) => {
  const { credential, handleEdit, handleDelete } = props;

  return (
    <li key={credential.id} className={s.container}>
      <LabeledInput disabled label={"key"} value={credential.azure_key || ""} type="text" placeholder="Key" name="credential_key" id="credential_key" htmlFor="credential_key" />
      <LabeledInput disabled label={"region"} value={credential.region || ""} type="text" placeholder="Region" name="credential_region" id="credential_region" htmlFor="credential_region" />
      <div className={s.actions}>
        <IconButton variant="transparent" icon={faEdit} onClick={() => handleEdit(credential)} />
        <IconButton variant="transparent" icon={faTrash} onClick={() => handleDelete(credential.id)} />
      </div>
    </li>
  )
}
