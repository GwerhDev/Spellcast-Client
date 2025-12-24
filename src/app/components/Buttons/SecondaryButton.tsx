import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import s from './SecondaryButton.module.css';

interface SecondaryButtonProps {
  text?: string;
  icon?: IconProp;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  children?: React.ReactNode;
}

export const SecondaryButton = (props: SecondaryButtonProps) => {
  const { text, icon, onClick, type, disabled, children } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <button className={s.container} onClick={handleOnClick} disabled={disabled} type={type || "button"} >
      {icon && <FontAwesomeIcon icon={icon} />}
      {text || children}
    </button>
  )
}
