import { PageTransition } from '../components/PageTransition';
import { GrimoireLanding } from '../components/GrimoireLanding';

export const Grimoire = () => (
  <PageTransition className="dashboard-sections">
    <GrimoireLanding />
  </PageTransition>
);
