import { PageTransition } from '../components/PageTransition';
import { EditorSelectLanding } from '../components/EditorSelectLanding';

export const EditorSelect = () => (
  <PageTransition className="dashboard-sections">
    <EditorSelectLanding />
  </PageTransition>
);
