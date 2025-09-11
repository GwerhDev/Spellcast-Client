import s from './PrimaryButton.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface PrimaryButtonProps {
  text?: string;
  icon?: IconProp;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  children?: React.ReactNode;
};

export const PrimaryButton = (props: PrimaryButtonProps) => {
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
};
