import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './ActionButton.module.css';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ReactNode } from 'react';

interface ActionButtonProps {
    text?: string;
    onClick?: () => void;
    icon?: IconProp;
    disabled?: boolean;
    href?: string;
    children?: ReactNode;
    type?: "button" | "submit" | "reset";
}

export const ActionButton = (props: ActionButtonProps) => {
  const { text, onClick, icon, disabled, href, children, type } = props;

  const handleOnClick = () => {
    return onClick && onClick();
  };

  return (
    <>
      {
        href
          ? <a href={href} className={s.container} onClick={handleOnClick}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {text}
          </a>
          :
          <button disabled={disabled} className={s.container} onClick={handleOnClick} type={type}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {text || children}
          </button>
      }
    </>
  )
}