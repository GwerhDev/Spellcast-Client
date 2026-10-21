import { PageTransition } from '../components/PageTransition';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { AccessKeys } from '../features/AccessKeys';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';
import { useGoBack } from '../../hooks/useGoBack';

// Real route (mirrors Credentials/Appearance/Storage, one of the Settings items): the
// caster's access keys (see features/AccessKeys). A back button is
// added since this is a level deeper than what the tab bar itself represents (its
// "Settings" tab lands on /caster/settings, not here) -- without it there'd be no way back
// except the browser's own back button. No "dashboard-sections" className -- CasterLayout
// itself carries that as the section's own outer scroll frame.
export const UserPermissions = () => {
  // Back where it was opened from, or up to '/caster/settings' when opened directly.
  const goBack = useGoBack('/caster/settings');
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={goBack} />
      </div>
      <AccessKeys />
    </PageTransition>
  );
};
