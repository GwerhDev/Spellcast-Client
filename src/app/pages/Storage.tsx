import { PageTransition } from '../components/PageTransition';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';
import { SectionHeader } from '../components/SectionHeader';
import { faDatabase } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Storage = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faDatabase} title={t.storage.title} subtitle={t.storage.subtitle} />
          <StorageOverview />
        </div>
      </div>
    </PageTransition>
  );
};
