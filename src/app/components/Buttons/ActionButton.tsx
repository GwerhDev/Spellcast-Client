import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './ActionButton.module.css';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ReactNode } from 'react';

interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>, "onClick" | "type" | "disabled" | "children" | "href" | "className"> {
    text?: string;
    onClick?: () => void;
    icon?: IconProp;
    disabled?: boolean;
    href?: string;
    children?: ReactNode;
    type?: "button" | "submit" | "reset";
    className?: string;
}

export const ActionButton = (props: ActionButtonProps) => {
  const { text, onClick, icon, disabled, href, children, type, className, ...rest } = props;

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <>
      {
        href
          ? <a href={href} className={`${s.container} ${className ?? ""}`} onClick={handleOnClick} {...rest}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {text}
          </a>
          :
          <button disabled={disabled} className={`${s.container} ${className ?? ""}`} onClick={handleOnClick} type={type} {...rest}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {text || children}
          </button>
      }
    </>
  )
}