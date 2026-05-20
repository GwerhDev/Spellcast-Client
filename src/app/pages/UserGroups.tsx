import { PageTransition } from '../components/PageTransition';
import { Groups } from '../components/Groups/Groups';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserGroups = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.nav.groups}</h1>
            <p>{t.groups.subtitle}</p>
          </div>
          <Groups />
        </div>
      </div>
    </PageTransition>
  );
};
