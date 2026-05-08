import { PageTransition } from '../components/PageTransition';
import { UserPresentation } from "../components/UserPresentation/UserPresentation";

export const Overview = () => (
  <PageTransition className="dashboard-sections">
    <UserPresentation />
  </PageTransition>
);
