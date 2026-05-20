import { PageTransition } from '../components/PageTransition';
import { Themes } from '../components/Themes/Themes';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Appearance = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.appearance.title}</h1>
            <p>{t.appearance.subtitle}</p>
          </div>
          <Themes />
        </div>
      </div>
    </PageTransition>
  );
};
