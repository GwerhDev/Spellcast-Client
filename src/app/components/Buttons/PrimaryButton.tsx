import s from './PrimaryButton.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import type { ButtonVariant } from '../../../interfaces';

interface PrimaryButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "disabled" | "children" | "className"> {
  text?: string;
  icon?: IconProp;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

export const PrimaryButton = (props: PrimaryButtonProps) => {
  const { text, icon, onClick, type, disabled, children, className, variant = "default", ...rest } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  const variantClass = variant === "danger" ? s.danger : variant === "accent" ? s.accent : "";

  return (
    <button disabled={disabled} className={`${s.container} ${variantClass} ${className ?? ""}`} onClick={handleOnClick} type={type || "button"} {...rest}>
      {icon && <FontAwesomeIcon icon={icon} />}
      <span>
        {text || children}
      </span>
    </button>
  )
};
