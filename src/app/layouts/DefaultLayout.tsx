import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/Tabs/TabBar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../components/Players/AudioPlayer/AudioPlayer';
import { LateralMenu } from '../components/LateralMenu/LateralMenu';
import { PdfProcessor } from '../components/PdfProcessor/PdfProcessor';
import { BrowserPlayer } from '../components/Players/BrowserPlayer/BrowserPlayer';
import { RootState } from 'store/index';
import { useSelector } from 'react-redux';
import spellcastIcon from '../../assets/spellcast-logo.svg';

export default function DefaultLayout() {
  const shouldHideMenu = location.pathname.startsWith(`/user`);
  const [showMenu, setShowMenu] = useState(shouldHideMenu);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);

  return (
    <main>
      <PdfProcessor />
      <div className="header-app">
        <span className="title-container">
          <img src={spellcastIcon} alt="Spellcast Icon" />
          <small className="font-bold nowrap">{"Spellcast"}</small>
        </span>
      </div>
      <div className='dashboard-container'>
        <aside className="aside-container">
          <TabBar setShowMenu={setShowMenu} />
          {showMenu && <LateralMenu />}
        </aside>
        <div className="app-viewer">
          <Outlet />
        </div>
      </div>
      <div className="audioplayer-container">
        {selectedVoice.type === 'browser' ? <BrowserPlayer /> : <AudioPlayer />}
      </div>
      <LogoutModal />
    </main>
  );
}
