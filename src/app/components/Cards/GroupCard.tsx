import s from "./CredentialCard.module.css";
import { faEdit, faSave, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "../Buttons/IconButton";
import { Group } from "src/interfaces";
import { LabeledInput } from "../Inputs/LabeledInput";
import { deleteGroup, createGroup, updateGroup } from "services/groups";
import { useState, useEffect } from "react";

interface GroupCardProps {
  group: Group;
  fetchGroups: () => void;
  onSaveNew?: () => void;
  onCancelNew?: () => void;
}

export const GroupCard = (props: GroupCardProps) => {
  const { group, fetchGroups, onSaveNew, onCancelNew } = props;
  const [editionActive, setEditionActive] = useState(group.isNew ? true : false);
  const [name, setName] = useState(group.name || "");

  useEffect(() => {
    setName(group.name || "");
    setEditionActive(group.isNew ? true : false);
  }, [group]);

  const handleSave = async () => {
    if (group.isNew) {
      await createGroup({ name });
      if (onSaveNew) onSaveNew();
    } else {
      await updateGroup(group.id!, { name });
      fetchGroups();
    }
    setEditionActive(false);
  };

  const handleCancel = () => {
    if (group.isNew) {
      if (onCancelNew) onCancelNew();
    } else {
      setName(group.name || "");
      setEditionActive(false);
    }
  };

  const handleEdit = () => {
    setEditionActive(true);
  };

  const handleDelete = async (groupId: string | undefined) => {
    if (group.isNew) {
      if (onCancelNew) onCancelNew();
    } else {
      await deleteGroup(groupId);
      fetchGroups();
    }
  };

  return (
    <li key={group.id} className={s.container}>
      <LabeledInput disabled={!editionActive} label={"name"} value={name} type="text" placeholder="Name for your Group" name="name" id="name" htmlFor="name" onChange={(e) => setName(e.target.value)} />
      <div className={s.actions}>
        {
          editionActive ?
            <IconButton variant="transparent" icon={faSave} onClick={() => handleSave()} />
            :
            <IconButton variant="transparent" icon={faEdit} onClick={() => handleEdit()} />
        }
        {
          group.isNew || editionActive ? (
            <IconButton variant="transparent" icon={faTimes} onClick={() => handleCancel()} />
          ) : (
            <IconButton variant="transparent" icon={faTrash} onClick={() => handleDelete(group.id)} />
          )
        }
      </div>
    </li>
  )
}
