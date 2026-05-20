import { PageTransition } from '../components/PageTransition';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Storage = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.storage.title}</h1>
            <p>{t.storage.subtitle}</p>
          </div>
          <StorageOverview />
        </div>
      </div>
    </PageTransition>
  );
};
