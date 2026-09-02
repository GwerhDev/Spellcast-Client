import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { AboutLicense } from '../components/AboutLicense/AboutLicense';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-82: AGPLv3 network-use clause -- an always-reachable in-app screen with the
// license and a link to the source code, one level under Settings like
// Credentials/Permissions/Appearance/Storage. A back button is added since this is a level
// deeper than what the tab bar itself represents (its "Settings" tab lands on
// /caster/settings, not here). No "dashboard-sections" className -- CasterLayout itself
// carries that as the section's own outer scroll frame.
export const About = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings')} />
      </div>
      <AboutLicense />
    </PageTransition>
  );
};
