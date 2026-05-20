import { PageTransition } from '../components/PageTransition';
import { HavenStoreLanding } from '../components/HavenStoreLanding';

export const HavenStore = () => (
  <PageTransition className="dashboard-sections">
    <HavenStoreLanding />
  </PageTransition>
);
