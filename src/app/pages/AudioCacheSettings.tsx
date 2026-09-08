import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { AudioCacheManager } from '../features/AudioCacheManager';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-118: one level under Storage, same shape as Local/Cloud (back button since this is
// deeper than what the tab bar itself represents). No "dashboard-sections" className --
// CasterLayout carries that as the section's own outer scroll frame.
export const AudioCacheSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings/storage')} />
      </div>
      <AudioCacheManager />
    </PageTransition>
  );
};
