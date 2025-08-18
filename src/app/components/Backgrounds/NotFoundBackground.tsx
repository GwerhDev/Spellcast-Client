import s from './Background.module.css';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const NotFoundBackground = () => {
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faBan} size="10x" />
      </span>
      <h2>404 - Trapped under code</h2>
    </div>
  );
};
