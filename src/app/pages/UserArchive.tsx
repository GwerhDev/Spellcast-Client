import { PageTransition } from '../components/PageTransition';
import { ProjectArchive } from '../components/Archives/ProjectArchive';
import { SectionHeader } from '../components/SectionHeader';
import { faBoxArchive } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserArchive = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faBoxArchive} title={t.archive.title} subtitle={t.archive.subtitle} />
          <ProjectArchive />
        </div>
      </div>
    </PageTransition>
  );
};
