import { PageTransition } from '../components/PageTransition';
import { DocumentCreateForm } from "../components/DocumentCreateForm";

export const DocumentCreate: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <DocumentCreateForm />
  </PageTransition>
);
