import { PageTransition } from '../components/PageTransition';
import { Credentials } from "../components/Credentials/Credentials";

export const UserCredentials = () => (
  <PageTransition className="dashboard-sections">
    <Credentials />
  </PageTransition>
);
