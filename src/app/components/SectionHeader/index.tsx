import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Tag } from '../Tag/Tag';

interface SectionHeaderProps {
  icon?: IconProp;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  count?: number;
  action?: React.ReactNode;
}

export const SectionHeader = ({ icon, title, subtitle, align = 'left', count, action }: SectionHeaderProps) => (
  <div className={`${s.header} ${align === 'center' ? s.center : ''}`}>
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
