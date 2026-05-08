import { PageTransition } from '../components/PageTransition';
import { Themes } from '../components/Themes/Themes';

export const Appearance = () => (
  <PageTransition className="dashboard-sections">
    <Themes />
  </PageTransition>
);
