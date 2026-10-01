import { PageTransition } from '../components/PageTransition';
import { SpellStorageManager } from '../features/SpellStorageManager';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';
import { useGoBack } from '../../hooks/useGoBack';

// TCORE-119: nested under Local (/caster/settings/storage/local/spells), same reasoning as
// TCORE-118's audio-cache page -- this is IndexedDB/local storage, not its own category.
// Back button returns to Local specifically. No "dashboard-sections" className --
// CasterLayout carries that as the section's own outer scroll frame.
export const SpellStorageSettings = () => {
  // Back where it was opened from, or up to '/caster/settings/storage/local' when opened directly.
  const goBack = useGoBack('/caster/settings/storage/local');
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={goBack} />
      </div>
      <SpellStorageManager />
    </PageTransition>
  );
};
