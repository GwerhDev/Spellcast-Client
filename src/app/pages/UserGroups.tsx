import { PageTransition } from '../components/PageTransition';
import { Groups } from "../components/Groups/Groups";

export const UserGroups = () => (
  <PageTransition className="dashboard-sections">
    <Groups />
  </PageTransition>
);
