import s from "./Account.module.css";
import { useSelector } from "react-redux";
import { ActionButton } from "../Buttons/ActionButton";
import { ACCOUNT_BASE } from "../../../config/api";
import { RootState } from "../../../store";
import { userData } from "../../../interfaces";

export const Account = () => {
  const userData: userData = useSelector((state: RootState) => state.session.userData);
  const { username, profilePic, role } = userData;

  return (
    <div className={s.container}>
      {
        profilePic
          ? <img className={s.profilePic} src={profilePic} alt="Profile picture" />
          : <span className={s.profilePic}>{username?.[0]}</span>
      }
      <h1>{username}</h1>
      <p>{role}</p>
      <ActionButton text={"View my account"} onClick={() => window.location.href = ACCOUNT_BASE} />
    </div>
  )
}
