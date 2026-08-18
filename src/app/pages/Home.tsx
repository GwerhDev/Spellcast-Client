import { PageTransition } from '../components/PageTransition';
import { Start } from '../components/Start';
import { LastSpells } from '../components/LastSpells';

export const Home = () => (
  <PageTransition className="dashboard-sections">
    <Start />
    <LastSpells />
  </PageTransition>
);
