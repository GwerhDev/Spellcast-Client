import { PageTransition } from '../components/PageTransition';
import { HomeStage } from '../features/HomeStage';

export const Home = () => (
  <PageTransition className="dashboard-sections">
    <HomeStage />
  </PageTransition>
);
