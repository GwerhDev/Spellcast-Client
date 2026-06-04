import { PageTransition } from '../components/PageTransition';
import { Themes } from '../components/Themes/Themes';
import { SectionHeader } from '../components/SectionHeader';
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Appearance = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faPalette} title={t.appearance.title} subtitle={t.appearance.subtitle} />
          <Themes />
        </div>
      </div>
    </PageTransition>
  );
};
