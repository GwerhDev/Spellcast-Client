import s from './Loader.module.css';
import { useState, useEffect } from 'react';
import spellcastIcon from '../../../assets/spellcast-logo.png';

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
  exiting?: boolean;
}

export const Loader = ({ progress = 0, message, exiting = false }: LoaderProps) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 2000);
    return () => clearInterval(id);
  }, [message]);

  return (
    <div className={`loader${exiting ? ' loader-exiting' : ''}`}>
      <div className={s.wrapper}>
        <div className={s.logoWrap} style={{ '--logo-mask': `url(${spellcastIcon})` } as React.CSSProperties}>
          <img className={s.logo} src={spellcastIcon} alt="" />
        </div>
        <span className={s.wordmark}>Spellcast</span>
        <div className={s.barTrack}>
          <div className={s.bar} style={{ width: `${progress}%` }} />
        </div>
        <span className={s.message}>{message || MESSAGES[msgIndex]}</span>
      </div>
    </div>
  );
};
