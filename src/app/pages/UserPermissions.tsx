import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft, faShield } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// Real route (mirrors Credentials/Appearance/Storage, one of the Settings items), but
// explicitly a placeholder -- access control isn't a backend concept yet, same
// mock-and-marked-as-such spirit UserShared used to be before its removal. A back button is
// added since this is a level deeper than what the tab bar itself represents (its
// "Settings" tab lands on /caster/settings, not here) -- without it there'd be no way back
// except the browser's own back button. No "dashboard-sections" className -- CasterLayout
// itself carries that as the section's own outer scroll frame.
export const UserPermissions = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings')} />
      </div>
      <EmptyState icon={faShield} message={t.permissions.empty} testId="caster-permissions-empty" />
    </PageTransition>
  );
};
