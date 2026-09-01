import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { Themes } from '../components/Themes/Themes';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar, which every /caster/* route renders
// under (reached here via the "Settings" tab -> Appearance). Its own UserPage.module.css
// .page/.content wrapper is dropped too -- CasterLayout's .content already establishes the
// full-width-then-centered-1024 frame. A back button is added since this is a level deeper
// than what the tab bar itself represents (its "Settings" tab lands on /caster/settings,
// not here) -- without it there'd be no way back except the browser's own back button.
export const Appearance = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={s.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/settings')} />
      </div>
      <Themes />
    </PageTransition>
  );
};
