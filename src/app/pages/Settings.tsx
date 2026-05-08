import { PageTransition } from '../components/PageTransition';
import { DirectoryList } from "../components/Dashboard/DirectoryList";

export const Settings = () => (
  <PageTransition className="dashboard-sections">
    <DirectoryList />
  </PageTransition>
);
