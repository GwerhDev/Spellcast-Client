import s from './Background.module.css';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const EmptyBackground = () => {
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faBan} size="10x" />
      </span>
      <h4>Emptiness is filling me</h4>
    </div>
  );
};
