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
  className?: string;
  variant?: "default" | "danger";
};

export const PrimaryButton = (props: PrimaryButtonProps) => {
  const { text, icon, onClick, type, disabled, children, className, variant = "default" } = props || {};

  const handleOnClick = () => {
    return onClick && onClick();
  };

  const variantClass = variant === "danger" ? s.danger : "";

  return (
    <button disabled={disabled} className={`${s.container} ${variantClass} ${className ?? ""}`} onClick={handleOnClick} type={type || "button"} >
      {icon && <FontAwesomeIcon icon={icon} />}
      <span>
        {text || children}
      </span>
    </button>
  )
};
