import { PageTransition } from '../components/PageTransition';
import { LibraryLanding } from '../components/LibraryLanding';

export const Library = () => (
  <PageTransition className="dashboard-sections">
    <LibraryLanding />
  </PageTransition>
);
