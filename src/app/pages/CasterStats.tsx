import s from './CasterStats.module.css';
import { PageTransition } from '../components/PageTransition';
import { GrimoireCharts } from '../components/GrimoireCharts/GrimoireCharts';
import { UserStats } from '../components/UserStats/UserStats';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';

// TCORE-107 follow-up: body of the "Stats" tab -- what used to be the standalone Dashboard
// route's content (activity chart + groups/shared + storage overview), now rendered under
// CasterLayout's shared header+tabs instead of owning its own page shell. No
// "dashboard-sections" className here -- CasterLayout itself now carries that global class
// as the section's own outer scroll frame (see CasterLayout.tsx).
export const CasterStats = () => (
  <PageTransition>
    <div data-testid="caster-stats" className={s.stats}>
      <GrimoireCharts />
      <UserStats />
      <StorageOverview />
    </div>
  </PageTransition>
);
