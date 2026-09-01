import { PageTransition } from '../components/PageTransition';
import { CasterProfileLanding } from '../features/CasterProfileLanding';

export const CasterProfile = () => (
  <PageTransition className="dashboard-sections">
    <CasterProfileLanding />
  </PageTransition>
);
