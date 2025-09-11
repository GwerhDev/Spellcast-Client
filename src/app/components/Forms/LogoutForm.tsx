import s from "./LogoutForm.module.css";
import { PrimaryButton } from "../Buttons/PrimaryButton";
import { SecondaryButton } from "../Buttons/SecondaryButton";
import { faRightFromBracket, faXmark } from "@fortawesome/free-solid-svg-icons";

interface LogoutFormProps {
  handleLogout: () => void;
  handleCancelLogout: () => void;
};

export const LogoutForm = (props: LogoutFormProps) => {
  const { handleLogout, handleCancelLogout } = props;

  return (
    <form className={s.container} action="">
      <h2>Are you leaving already?</h2>
      <p>Confirm that you want to log out</p>
      <ul className={s.buttonContainer}>
        <PrimaryButton icon={faRightFromBracket} onClick={handleLogout} text='Logout' type='button' />
        <SecondaryButton icon={faXmark} onClick={handleCancelLogout} text='Cancel' type='button' />
      </ul>
    </form>
  )
};
