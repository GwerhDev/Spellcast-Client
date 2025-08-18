import { Outlet } from 'react-router-dom';
import { RootState } from '../../store';
import { useSelector } from 'react-redux';
import { LateralTab } from '../components/LateralTab/LateralTab';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { userData } from '../../interfaces';

export default function DefaultLayout() {
  const userData: userData = useSelector((state: RootState) => state.session.userData);

  return (
    <main>
      <div className='dashboard-container'>
        <LateralTab userData={userData} />
        <div className="project-viewer">
          <div className="header-app">
            <span className="title-container">
              <small className="font-bold nowrap">{"Spellcast"}</small>
            </span>
          </div>
          <Outlet />
        </div>
      </div>
      <LogoutModal />
    </main>
  );
}
