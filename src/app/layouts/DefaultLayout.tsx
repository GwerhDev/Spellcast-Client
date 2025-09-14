import { Outlet } from 'react-router-dom';
import { LateralTab } from '../components/LateralTab/LateralTab';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../components/AudioPlayer/AudioPlayer';

export default function DefaultLayout() {

  return (
    <main>
      <div className='dashboard-container'>
        <LateralTab />
        <div className="app-viewer">
          <div className="header-app">
            <span className="title-container">
              <small className="font-bold nowrap">{"Spellcast"}</small>
            </span>
          </div>
          <Outlet />
        </div>
      </div>
      <AudioPlayer />
      <LogoutModal />
    </main>
  );
}
