import { RecentLocalDocument } from '../components/RecentLocalDocument';
import { Start } from '../components/Start';

export const Home = () => {
  return (
    <div className="dashboard-sections">
      <ul>
        <li><Start /></li>
        <li><RecentLocalDocument /></li>
      </ul>
    </div>
  );
};
