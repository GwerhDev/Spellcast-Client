import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/Tabs/TabBar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../components/Players/AudioPlayer/AudioPlayer';
import { LateralMenu } from '../components/LateralMenu/LateralMenu';
import { PdfProcessor } from '../components/PdfProcessor/PdfProcessor';
import { BrowserPlayer } from '../components/Players/BrowserPlayer/BrowserPlayer';
import { RootState } from 'store/index';
import { useSelector } from 'react-redux';
import { PageSelectorModal } from '../components/Modals/PageSelectorModal';
import { PlayerSettings } from '../components/Modals/PlayerSettings';
import { ReaderSettings } from '../components/DocumentReader/ReaderSettings';
import { EditorSettings } from '../components/EditorSettingsPanel/EditorSettings';
import { AccountMenu } from '../components/AccountMenu/AccountMenu';
import { AppSwitcher } from '../components/AppSwitcher/AppSwitcher';

export default function DefaultLayout() {
  const shouldHideMenu = location.pathname.startsWith(`/user`);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { isLoaded: documentLoaded } = useSelector((state: RootState) => state.pdfReader);
  const [showMenu, setShowMenu] = useState(shouldHideMenu);
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!window.matchMedia('(max-width: 768px)').matches) return;
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main>
      <PdfProcessor />
      <PageSelectorModal />
      <PlayerSettings
        show={isPlayerSettingsOpen}
        onClose={() => setIsPlayerSettingsOpen(false)}
      />
      <div className="header-app">
        <AppSwitcher />
        <AccountMenu />
      </div>
      <div className="dashboard-container">
        <nav className="nav-container" ref={navRef}>
          <aside className="aside-container">
            <div className="aside-inner-container">
              <TabBar showMenu={showMenu} setShowMenu={setShowMenu} />
              {showMenu && <LateralMenu onNavigate={() => { if (window.matchMedia('(max-width: 768px)').matches) setShowMenu(false); }} />}
            </div>
          </aside>
        </nav>
        <div className="app-viewer">
          <Outlet />
        </div>
        <ReaderSettings />
        <EditorSettings />
      </div>
      {documentLoaded && (
        <div className="audioplayer-container">
          {selectedVoice.type === 'browser'
            ? <BrowserPlayer showVoiceSelectorModal={setIsPlayerSettingsOpen} />
            : <AudioPlayer showVoiceSelectorModal={setIsPlayerSettingsOpen} />}
        </div>
      )}
      <LogoutModal />
    </main>
  );
}
