import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';

interface SectionHeaderProps {
  /** Optional accent icon shown in a primary-tinted chip before the title. */
  icon?: IconProp;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

/**
 * Sober, professional section header: a primary-tinted icon chip + a solid-color
 * title + optional subtitle. Replaces the previous gradient `featured` titles
 * across the app's sections (the `featured` gradient is now reserved for a few
 * strategic brand moments only).
 */
export const SectionHeader = ({ icon, title, subtitle, align = 'left' }: SectionHeaderProps) => (
  <div className={`${s.header} ${align === 'center' ? s.center : ''}`}>
    <div className={s.titleRow}>
      {icon && (
        <span className={s.iconChip}>
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      <h1 className={`${s.title} featured-glow`}>{title}</h1>
    </div>
    {subtitle && <p className={s.subtitle}>{subtitle}</p>}
  </div>
);
