import { PageTransition } from '../components/PageTransition';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';

export const Storage = () => (
  <PageTransition className="dashboard-sections">
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', padding: '1rem' }}>
      <StorageOverview />
    </div>
  </PageTransition>
);
