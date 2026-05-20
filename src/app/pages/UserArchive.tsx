import { PageTransition } from '../components/PageTransition';
import { ProjectArchive } from '../components/Archives/ProjectArchive';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserArchive = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.archive.title}</h1>
            <p>{t.archive.subtitle}</p>
          </div>
          <ProjectArchive />
        </div>
      </div>
    </PageTransition>
  );
};
