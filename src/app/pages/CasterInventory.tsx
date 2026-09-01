import { PageTransition } from '../components/PageTransition';
import { CasterInventoryLanding } from '../features/CasterInventoryLanding';

// TCORE-109: no "dashboard-sections" className here -- CasterLayout itself carries that
// global class as the section's own outer scroll frame (see CasterLayout.tsx's comment).
export const CasterInventory = () => (
  <PageTransition>
    <CasterInventoryLanding />
  </PageTransition>
);
