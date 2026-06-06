import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import s from './Tag.module.css';

export type TagTone = 'default' | 'primary' | 'live' | 'ok' | 'warning' | 'danger';
export type TagSize = 'sm' | 'md';

interface TagProps {
  children: React.ReactNode;
  tone?: TagTone;
  size?: TagSize;
  dot?: boolean;
  icon?: IconProp;
}

export const Tag = ({ children, tone = 'default', size = 'sm', dot = false, icon }: TagProps) => (
  <span className={`${s.tag} ${s[tone]} ${s[size]}`}>
    {(dot || tone === 'live') && <span className={s.dot} />}
    {icon && <FontAwesomeIcon icon={icon} />}
    {children}
  </span>
);
