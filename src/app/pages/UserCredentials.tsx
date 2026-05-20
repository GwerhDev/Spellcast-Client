import { PageTransition } from '../components/PageTransition';
import { Credentials } from '../components/Credentials/Credentials';
import { useLanguage } from '../../i18n';
import s from './UserPage.module.css';

export const UserCredentials = () => {
  const { t } = useLanguage();

  return (
    <PageTransition className="dashboard-sections">
      <div className={s.page}>
        <div className={s.content}>
          <div className={s.header}>
            <h1 className="featured">{t.nav.credentials}</h1>
            <p>{t.credentials.subtitle}</p>
          </div>
          <Credentials />
        </div>
      </div>
    </PageTransition>
  );
};
