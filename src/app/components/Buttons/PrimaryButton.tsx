import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './PrimaryButton.module.css';

export const PrimaryButton = (props: any) => {
  const { text, icon, onClick, type, disabled, children } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <button disabled={disabled} className={s.container} onClick={handleOnClick} type={type || "button"} >
      {icon && <FontAwesomeIcon icon={icon} />}
      <span>
        {text || children}
      </span>
    </button>
  )
}
