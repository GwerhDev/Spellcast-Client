import { PageTransition } from '../components/PageTransition';
import { EditorLanding } from '../components/EditorLanding';

export const Editor = () => (
  <PageTransition className="dashboard-sections">
    <EditorLanding />
  </PageTransition>
);
