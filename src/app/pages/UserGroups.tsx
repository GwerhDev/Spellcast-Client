import { PageTransition } from '../components/PageTransition';
import { Groups } from '../components/Groups/Groups';
import { SectionHeader } from '../components/SectionHeader';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserGroups = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faUsers} title={t.nav.groups} subtitle={t.groups.subtitle} />
          <Groups />
        </div>
      </div>
    </PageTransition>
  );
};
