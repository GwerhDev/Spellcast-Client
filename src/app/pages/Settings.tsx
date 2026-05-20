import { PageTransition } from '../components/PageTransition';
import { DirectoryList } from '../components/Dashboard/DirectoryList';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Settings = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.common.settings}</h1>
            <p>{t.settings.subtitle}</p>
          </div>
          <DirectoryList />
        </div>
      </div>
    </PageTransition>
  );
};
