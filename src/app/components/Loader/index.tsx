import s from './Loader.module.css';
import { useState, useEffect } from 'react';
import spellcastIcon from '../../../assets/spellcast-logo.svg';

const MESSAGES = [
  "Preparing your grimoire…",
  "Summoning voices…",
  "Awakening the reader…",
  "Loading your library…",
  "Casting spells…",
  "Binding the pages…",
];

interface LoaderProps {
  progress?: number;
  message?: string;
}

export const Loader = ({ progress = 0, message }: LoaderProps) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 2000);
    return () => clearInterval(id);
  }, [message]);

  return (
    <div className="loader">
      <div className={s.wrapper}>
        <img className={s.logo} src={spellcastIcon} />
        <div className={s.barTrack}>
          <div className={s.bar} style={{ width: `${progress}%` }} />
        </div>
        <span className={s.message}>{message || MESSAGES[msgIndex]}</span>
      </div>
    </div>
  );
};
