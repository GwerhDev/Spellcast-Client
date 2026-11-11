import s from "./IconButton.module.css";
import { ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavIcon, isAnimatedIcon } from "../NavIcon/NavIcon";

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  icon: IconProp;
  text?: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "transparent";
  // What it opens is open (or its mode is on): one of our icons that moves stays as it is on hover.
  active?: boolean;
};

export const IconButton = (props: IconButtonProps) => {
  const { icon, text, title, children, className, disabled, onClick, variant = "transparent", active = false, ...rest } = props;

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
      {isAnimatedIcon(icon) ? <NavIcon icon={icon} active={active} /> : <FontAwesomeIcon icon={icon} />}
      {text || children}
    </button>
  );
};