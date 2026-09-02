import s from './AboutLicense.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch, faScaleBalanced, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { EXTERNAL_LINKS } from '../../../config/externalLinks';
import { useLanguage } from '../../../i18n';

// Presentational (Layer 4): the AGPLv3 network-use notice required by TCORE-82 -- reachable
// from any logged-in session via Settings > About, independent of who's hosting this build.
export const AboutLicense = () => {
  const { t } = useLanguage();

  return (
    <div className={s.container} data-testid="about-license">
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardIcon}><FontAwesomeIcon icon={faScaleBalanced} /></span>
          <span className={s.cardTitle}>{t.about.licenseTitle}</span>
        </div>
        <p className={s.body}>{t.about.licenseBody}</p>
        <a
          className={s.link}
          href={EXTERNAL_LINKS.licenseText}
          target="_blank"
          rel="noreferrer"
          data-testid="about-license-link"
        >
          {t.about.readLicense}
          <FontAwesomeIcon icon={faUpRightFromSquare} className={s.linkIcon} />
        </a>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardIcon}><FontAwesomeIcon icon={faCodeBranch} /></span>
          <span className={s.cardTitle}>{t.about.sourceTitle}</span>
        </div>
        <p className={s.body}>{t.about.sourceBody}</p>
        <a
          className={s.link}
          href={EXTERNAL_LINKS.sourceCode}
          target="_blank"
          rel="noreferrer"
          data-testid="about-source-link"
        >
          {t.about.viewSource}
          <FontAwesomeIcon icon={faUpRightFromSquare} className={s.linkIcon} />
        </a>
      </div>

      <p className={s.copyright} data-testid="about-copyright">{t.about.copyright}</p>
    </div>
  );
};
