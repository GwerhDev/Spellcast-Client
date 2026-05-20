import { PageTransition } from '../components/PageTransition';
import { BrowserStorage } from '../components/BrowserStorage/BrowserStorage';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const StorageLocal = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.storage.browserStorage}</h1>
            <p>{t.storage.localSubtitle}</p>
          </div>
          <BrowserStorage />
        </div>
      </div>
    </PageTransition>
  );
};
