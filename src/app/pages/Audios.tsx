import { PageTransition } from '../components/PageTransition';
import { useLanguage } from '../../i18n';

export const Audios = () => {
  const { t } = useLanguage();
  return (
    <PageTransition className="dashboard-sections">
      {t.nav.audios}
    </PageTransition>
  );
};
