import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Tag } from '../Tag/Tag';

interface SectionHeaderProps {
  icon?: IconProp;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  count?: number;
  action?: React.ReactNode;
  onBack?: () => void;
}

export const SectionHeader = ({ icon, title, subtitle, align = 'left', count, action, onBack }: SectionHeaderProps) => (
  <div className={`${s.header} ${align === 'center' ? s.center : ''}`}>
    {onBack && (
      <button type="button" className={s.backBtn} onClick={onBack} aria-label="Go back">
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>
    )}
    <div className={s.titleRow}>
      {icon && (
        <span className={s.iconChip}>
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      <h1 className={`${s.title} featured-glow`}>{title}</h1>
      {count !== undefined && (
        <Tag tone="default" size="sm">{count}</Tag>
      )}
      {action && <span className={s.action}>{action}</span>}
    </div>
    {subtitle && <p className={s.subtitle}>{subtitle}</p>}
  </div>
);
