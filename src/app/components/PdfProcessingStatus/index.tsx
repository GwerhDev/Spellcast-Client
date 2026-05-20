import React from 'react';
import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faFile } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

interface PdfProcessingStatusProps {
  variant: 'overlay' | 'compact';
  progress: { current: number; total: number } | null;
  coverUrl: string | null;
  documentTitle: string;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export const PdfProcessingStatus: React.FC<PdfProcessingStatusProps> = ({
  variant,
  progress,
  coverUrl,
  documentTitle,
  onCollapse,
  onExpand,
}) => {
  const { t } = useLanguage();
  const progressPct = progress ? (progress.current / progress.total) * 100 : 0;
  const progressLabel = progress ? `${progress.current}/${progress.total}` : null;
  const label = progressLabel
    ? `${t.document.processingPdf} (${progressLabel})`
    : t.document.processingPdf;

  if (variant === 'compact') {
    return (
      <button className={s.compact} onClick={onExpand} title={label}>
        {coverUrl
          ? <img src={coverUrl} className={s.compactCover} alt="" />
          : <FontAwesomeIcon icon={faFile} className={s.compactIcon} />
        }
        <span className={s.compactLabel}>{label}</span>
        <FontAwesomeIcon icon={faChevronDown} className={s.compactChevron} />
      </button>
    );
  }

  return (
    <div className={s.overlay}>
      <div className={s.card}>
        <button className={s.collapseBtn} onClick={onCollapse} title={t.common.minimize}>
          <FontAwesomeIcon icon={faChevronUp} />
        </button>
        {coverUrl
          ? <img src={coverUrl} alt="" className={s.cover} />
          : <FontAwesomeIcon icon={faFile} className={s.fallback} />
        }
        {documentTitle && <span className={s.title}>{documentTitle}</span>}
        <span className={s.processingLabel}>{label}</span>
        <div className={s.track}>
          <div className={s.fill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
};
