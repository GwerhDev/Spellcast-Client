import { PageTransition } from '../components/PageTransition';
import { DirectoryList } from '../components/Dashboard/DirectoryList';
import { SectionHeader } from '../components/SectionHeader';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const Settings = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faGear} title={t.common.settings} subtitle={t.settings.subtitle} />
          <DirectoryList />
        </div>
      </div>
    </PageTransition>
  );
};
