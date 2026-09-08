import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { AudioCacheManager } from '../features/AudioCacheManager';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-118: nested under Local (/caster/settings/storage/local/audio-cache), not a sibling
// of Local/Cloud -- audio cache is IndexedDB, part of local storage, not its own storage
// category. Back button returns to Local specifically (one level up), same shape as every
// other level-2+ subroute. No "dashboard-sections" className -- CasterLayout carries that
// as the section's own outer scroll frame.
export const AudioCacheSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings/storage/local')} />
      </div>
      <AudioCacheManager />
    </PageTransition>
  );
};
