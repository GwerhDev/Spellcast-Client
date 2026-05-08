import { PageTransition } from '../components/PageTransition';
import { DirectoryList } from "../components/Dashboard/DirectoryList";

export const Storage = () => (
  <PageTransition className="dashboard-sections">
    <DirectoryList />
  </PageTransition>
);
