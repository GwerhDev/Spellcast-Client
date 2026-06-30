import { PageTransition } from '../components/PageTransition';
import { DocumentCreateForm } from "../features/DocumentCreateForm";

export const DocumentCreate: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <DocumentCreateForm />
  </PageTransition>
);
