import s from "./IconButton.module.css";
import { ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  icon: IconProp;
  text?: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "transparent";
};

export const IconButton = (props: IconButtonProps) => {
  const { icon, text, title, children, className, disabled, onClick, variant = "transparent", ...rest } = props;

  const variantClass = {
    primary: s.primary,
    transparent: s.transparent,
  }[variant];

  const buttonClassName = [s.base, variantClass, className]
    .filter(Boolean)
    .join(" ");

  const accessibleName = title ?? (typeof text === "string" ? text : undefined);

  return (
    <button
      {...rest}
      disabled={disabled}
      className={buttonClassName}
      onClick={onClick}
      title={title}
      aria-label={!text && accessibleName ? accessibleName : undefined}
    >
      <FontAwesomeIcon icon={icon} />
      {text || children}
    </button>
  );
};