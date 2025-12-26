import { Start } from '../components/Start';
import { LastDocuments } from '../components/LastDocuments';

export const Home = () => {
  return (
    <div className="dashboard-sections">
      <Start />
      <LastDocuments />
    </div>
  );
};
