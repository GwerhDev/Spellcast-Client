import { Outlet } from 'react-router-dom';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { Browser } from '../components/Browser/Browser';

export default function UserLayout() {
  return (
    <>
      <div className="dashboard-sections">
        <Browser>
          <Outlet />
        </Browser >
      </div >
      <LogoutModal />
    </>
  );
}
