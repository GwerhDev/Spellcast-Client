import { PageTransition } from '../components/PageTransition';
import { Credentials } from '../components/Credentials/Credentials';
import { SectionHeader } from '../components/SectionHeader';
import { faFingerprint } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserCredentials = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <SectionHeader icon={faFingerprint} title={t.nav.credentials} subtitle={t.credentials.subtitle} />
          <Credentials />
        </div>
      </div>
    </PageTransition>
  );
};
