import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import s from './SecondaryButton.module.css';

interface SecondaryButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "disabled" | "children" | "className"> {
  text?: string;
  icon?: IconProp;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const SecondaryButton = (props: SecondaryButtonProps) => {
  const { text, icon, onClick, type, disabled, children, className, ...rest } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <button className={`${s.container} ${className ?? ''}`} onClick={handleOnClick} disabled={disabled} type={type || "button"} {...rest}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {text || children}
    </button>
  )
}
