import { PageTransition } from '../components/PageTransition';
import { Start } from '../components/Start';
import { LastDocuments } from '../components/LastDocuments';

export const Home = () => (
  <PageTransition className="dashboard-sections">
    <Start />
    <LastDocuments />
  </PageTransition>
);
