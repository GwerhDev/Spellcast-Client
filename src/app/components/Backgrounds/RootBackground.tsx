import s from './Background.module.css';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const RootBackground = () => {
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faFolderOpen} size="10x" />
      </span>
      <h2>Root</h2>
      <small>Watch me freak</small>
    </div>
  );
};
