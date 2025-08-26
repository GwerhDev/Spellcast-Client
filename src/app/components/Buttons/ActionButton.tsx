import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './ActionButton.module.css';

export const ActionButton = (props: any) => {
  const { text, onClick, icon, disabled, href, children } = props || {};

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
          <button disabled={disabled} className={s.container} onClick={handleOnClick}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {text || children}
          </button>
      }
    </>
  )
}
