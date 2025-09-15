import { Outlet } from 'react-router-dom';
import { LateralTab } from '../components/LateralTab/LateralTab';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../components/AudioPlayer/AudioPlayer';
import { LateralMenu } from '../components/LateralMenu/LateralMenu';
import { PdfProcessor } from '../components/PdfProcessor/PdfProcessor';
import { useState } from 'react';

export default function DefaultLayout() {
  const shouldHideMenu = location.pathname.startsWith(`/user`);
  const [showMenu, setShowMenu] = useState(shouldHideMenu);

  return (
    <main>
      <PdfProcessor />
      <div className='dashboard-container'>
        <aside className="aside-container">
          <LateralTab setShowMenu={setShowMenu} />
          {showMenu && <LateralMenu />}
        </aside>
        <div className="app-viewer">
          <div className="header-app">
            <span className="title-container">
              <small className="font-bold nowrap">{"Spellcast"}</small>
            </span>
          </div>
          <Outlet />
        </div>
      </div>
      <div className="audioplayer-container">
        <AudioPlayer />
      </div>
      <LogoutModal />
    </main>
  );
}
