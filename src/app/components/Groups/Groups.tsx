import s from "./Groups.module.css";
import { useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Group } from "../../../interfaces";
import { GroupCard } from "../Cards/GroupCard";
import { Spinner } from "../Spinner";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "store";
import { getGroups } from "store/groupsSlice";

export const Groups = () => {
  const dispatch: AppDispatch = useDispatch();
  const { groups, loading } = useSelector((state: RootState) => state.groups);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);

  const handleAdd = () => {
    setIsAddingNewGroup(true);
  };

  const handleSaveNewCredential = () => {
    setIsAddingNewGroup(false);
    dispatch(getGroups());
  };

  const handleCancelNewCredential = () => {
    setIsAddingNewGroup(false);
  };

  return (
    <div className={s.container}>
      <h1>Groups</h1>
      <ul className={s.list}>
        {groups.map((group: Group) => (
          <GroupCard fetchGroups={() => dispatch(getGroups())} group={group} key={group.id} />
        ))}
        {
          isAddingNewGroup ? (
            <GroupCard
              group={{ id: "", name: "", isNew: true }}
              fetchGroups={() => dispatch(getGroups())}
              onSaveNew={handleSaveNewCredential}
              onCancelNew={handleCancelNewCredential}
            />
          ) : (
            <>
              {
                !loading &&
                <li className={s.emptyItem} onClick={handleAdd}>
                  <FontAwesomeIcon icon={faPlus} />
                  Create new group
                </li>
              }
            </>
          )
        }
        {
          loading && !groups.length && !isAddingNewGroup && <Spinner isLoading={loading} />
        }
      </ul>
    </div>
  );
};
