import { PageTransition } from '../components/PageTransition';
import { BrowserStorage } from '../components/BrowserStorage/BrowserStorage';
import { SectionHeader } from '../components/SectionHeader';
import { faHardDrive } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const StorageLocal = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faHardDrive} title={t.storage.browserStorage} subtitle={t.storage.localSubtitle} />
          <BrowserStorage />
        </div>
      </div>
    </PageTransition>
  );
};
