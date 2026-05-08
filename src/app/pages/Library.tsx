import { PageTransition } from '../components/PageTransition';
import { DocumentList } from "../components/DocumentList";

export const Library = () => (
  <PageTransition className="dashboard-sections">
    <DocumentList />
  </PageTransition>
);
