import s from "./IconButton.module.css";
import { ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface IconButtonProps {
  icon: IconProp;
  text?: string;
  title?: string;
  disabled?: boolean;
  readonly?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "transparent";
}

export const IconButton = (props: IconButtonProps) => {
  const { icon, text, title, children, className, disabled, onClick, variant = "transparent", ...rest } = props;

  const variantClass = {
    primary: s.primary,
    transparent: s.transparent,
  }[variant];

  const buttonClassName = [s.base, variantClass, className]
    .filter(Boolean)
    .join(" ");

  // For icon-only buttons, surface the label as a native tooltip + accessible name.
  const accessibleName = title ?? (typeof text === "string" ? text : undefined);

  return (
    <button
      disabled={disabled}
      className={buttonClassName}
      onClick={onClick}
      title={title}
      aria-label={!text && accessibleName ? accessibleName : undefined}
    >
      <FontAwesomeIcon {...rest} icon={icon} />
      {text || children}
    </button>
  );
};