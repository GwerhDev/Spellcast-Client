import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { SpellStorageManager } from '../features/SpellStorageManager';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-119: nested under Local (/caster/settings/storage/local/spells), same reasoning as
// TCORE-118's audio-cache page -- this is IndexedDB/local storage, not its own category.
// Back button returns to Local specifically. No "dashboard-sections" className --
// CasterLayout carries that as the section's own outer scroll frame.
export const SpellStorageSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings/storage/local')} />
      </div>
      <SpellStorageManager />
    </PageTransition>
  );
};
