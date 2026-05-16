import s from "./LogoutForm.module.css";
import { PrimaryButton } from "../Buttons/PrimaryButton";
import { SecondaryButton } from "../Buttons/SecondaryButton";
import { faRightFromBracket, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "src/i18n";

interface LogoutFormProps {
  handleLogout: () => void;
  handleCancelLogout: () => void;
};

export const LogoutForm = (props: LogoutFormProps) => {
  const { handleLogout, handleCancelLogout } = props;
  const { t } = useLanguage();

  return (
    <form className={s.container} action="">
      <h2>{t.auth.leavingAlready}</h2>
      <p>{t.auth.confirmLogout}</p>
      <ul className={s.buttonContainer}>
        <PrimaryButton icon={faRightFromBracket} onClick={handleLogout} text={t.auth.logout} type='button' />
        <SecondaryButton icon={faXmark} onClick={handleCancelLogout} text={t.common.cancel} type='button' />
      </ul>
    </form>
  )
};
