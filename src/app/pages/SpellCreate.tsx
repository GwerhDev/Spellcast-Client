import { PageTransition } from '../components/PageTransition';
import { SpellCreateForm } from "../features/SpellCreateForm";

export const SpellCreate: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <SpellCreateForm />
  </PageTransition>
);
