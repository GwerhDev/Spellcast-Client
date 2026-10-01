import { PageTransition } from '../components/PageTransition';
import { Credentials } from '../components/Credentials/Credentials';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';
import { useGoBack } from '../../hooks/useGoBack';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar, which every /caster/* route renders
// under (reached here via the "Settings" tab -> Credentials). No "dashboard-sections"
// className here either -- CasterLayout itself now carries that global class as the
// section's own outer scroll frame; applying it again on every nested page stacked a
// second overflow:auto boundary tight around each page's own content (see
// CasterLayout.tsx). A back button is added since this is a level deeper than what the tab
// bar itself represents (its "Settings" tab lands on /caster/settings, not here) -- without
// it there'd be no way back except the browser's own back button.
export const UserCredentials = () => {
  // Back where it was opened from, or up to '/caster/settings' when opened directly.
  const goBack = useGoBack('/caster/settings');
  const { t } = useLanguage();

  return (
    <PageTransition>
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={goBack} />
      </div>
      <Credentials />
    </PageTransition>
  );
};
