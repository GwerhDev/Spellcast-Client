import s from './Loader.module.css';
import spellcastIcon from '../../../assets/spellcast-logo.svg';

interface LoaderProps {
  progress?: number;
  message?: string;
}

export const Loader = ({ progress = 0, message }: LoaderProps) => {
  return (
    <div className="loader">
      <div className={s.wrapper}>
        <img className={s.logo} src={spellcastIcon} />
        <div className={s.barTrack}>
          <div className={s.bar} style={{ width: `${progress}%` }} />
        </div>
        {message && <span className={s.message}>{message}</span>}
      </div>
    </div>
  );
};
