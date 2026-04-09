import s from './Loader.module.css';
import spellcastIcon from '../../../assets/spellcast-logo.svg';

interface LoaderProps {
  progress?: number;
}

export const Loader = ({ progress = 0 }: LoaderProps) => {
  return (
    <div className="loader">
      <div className={s.wrapper}>
        <img className={s.logo} src={spellcastIcon} />
        <div className={s.barTrack}>
          <div className={s.bar} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};
