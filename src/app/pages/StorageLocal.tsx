import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { BrowserStorage } from '../components/BrowserStorage/BrowserStorage';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar, which every /caster/* route renders
// under. No "dashboard-sections" className here either -- CasterLayout itself now carries
// that global class as the section's own outer scroll frame; applying it again on every
// nested page stacked a second overflow:auto boundary tight around each page's own content
// (see CasterLayout.tsx). A back button is added since this is a level deeper than what the
// tab bar itself represents (its "Settings" tab lands on /caster/settings, not here --
// Storage is a flat item within Settings, TCORE-109) -- without it there'd be no way back
// except the browser's own back button.
export const StorageLocal = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings/storage')} />
      </div>
      <BrowserStorage />
    </PageTransition>
  );
};
