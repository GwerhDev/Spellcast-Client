import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './SecondaryButton.module.css';

export const SecondaryButton = (props: any) => {
  const { text, icon, onClick, type, disabled } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <button  className={s.container} onClick={handleOnClick} disabled={disabled} type={type || "button"} >
      {icon && <FontAwesomeIcon icon={icon} />}
      {text}
    </button>
  )
}
