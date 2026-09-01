import { PageTransition } from '../components/PageTransition';
import { CasterProfileLanding } from '../features/CasterProfileLanding';

// TCORE-107 follow-up: no "dashboard-sections" className here -- CasterLayout itself now
// carries that global class as the section's own outer scroll frame (see CasterLayout.tsx).
export const CasterProfile = () => (
  <PageTransition>
    <CasterProfileLanding />
  </PageTransition>
);
