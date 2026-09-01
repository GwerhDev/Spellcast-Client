import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-109 (reverted): Storage lives inside Settings now, a flat item alongside
// Credentials/Permissions/Appearance -- same depth, same pattern (this page's own
// title/subtitle heading is dropped, redundant with the tab bar; a back button is added
// since this is a level deeper than what the "Settings" tab itself represents, its own tab
// lands on /caster/settings, not here). No "dashboard-sections" className either --
// CasterLayout itself carries that global class as the section's own outer scroll frame.
export const Storage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings')} />
      </div>
      <StorageOverview />
    </PageTransition>
  );
};
