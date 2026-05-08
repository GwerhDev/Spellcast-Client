import { PageTransition } from '../components/PageTransition';
import { ProjectArchive } from "../components/Archives/ProjectArchive";

export const UserArchive = () => (
  <PageTransition className="dashboard-sections">
    <ProjectArchive />
  </PageTransition>
);
