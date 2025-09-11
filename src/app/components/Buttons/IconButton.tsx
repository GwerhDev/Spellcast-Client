import s from "./IconButton.module.css";
import { ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface IconButtonProps {
  icon: IconProp;
  text?: string;
  children?: ReactNode;
  className?: string;
  onClick: () => void;
  variant?: "primary" | "transparent";
}

export const IconButton = (props: IconButtonProps) => {
  const { icon, text, children, className, onClick, variant = "primary" } = props;

  const variantClass = {
    primary: s.primary,
    transparent: "",
  }[variant];

  const buttonClassName = [s.base, variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClassName} onClick={onClick}>
      <FontAwesomeIcon icon={icon} />
      {text || children}
    </button>
  );
};