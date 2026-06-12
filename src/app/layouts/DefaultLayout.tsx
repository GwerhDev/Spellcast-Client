import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/Tabs/TabBar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../components/Players/AudioPlayer/AudioPlayer';
import { LateralMenu } from '../components/LateralMenu/LateralMenu';
import { PdfProcessor } from '../components/PdfProcessor/PdfProcessor';
import { BrowserPlayer } from '../components/Players/BrowserPlayer/BrowserPlayer';
import { RootState } from 'store/index';
import { useSelector } from 'react-redux';
import { SearcherModal } from '../components/Modals/SearcherModal';
import { PlayerSettings } from '../components/Modals/PlayerSettings';
import { ReaderSettings } from '../components/DocumentReader/ReaderSettings';
import { EditorSettings } from '../components/EditorSettingsPanel/EditorSettings';
import { AccountMenu } from '../components/AccountMenu/AccountMenu';
import { AppSwitcher } from '../components/AppSwitcher/AppSwitcher';
import { VoiceSelectorModal } from '../components/Modals/VoiceSelectorModal';
import { SoundBackground } from '../components/SoundBackground/SoundBackground';
import { PdfUploadWorker } from '../components/PdfUploadWorker';
import { PdfUploadQueue } from '../components/PdfUploadQueue';
import { NotificationsButton } from '../features/NotificationsButton';
import { Desktop } from '../features/Desktop';
import { useAppDispatch } from 'store/hooks';
import { setMinimized } from 'store/desktopSlice';

export default function DefaultLayout() {
  const shouldHideMenu = location.pathname.startsWith(`/user`);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { isLoaded: documentLoaded } = useSelector((state: RootState) => state.pdfReader);
  const minimized = useSelector((state: RootState) => state.desktop.minimized);
  const dispatch = useAppDispatch();
  const [showMenu, setShowMenu] = useState(shouldHideMenu);
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!window.matchMedia('(max-width: 1024px)').matches) return;
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main>
      <SoundBackground />
      <PdfProcessor />
      <PdfUploadWorker />
      <SearcherModal />
      <VoiceSelectorModal
        show={isVoiceSelectorOpen}
        onClose={() => setIsVoiceSelectorOpen(false)}
      />
      <PlayerSettings
        show={isPlayerSettingsOpen}
        onClose={() => setIsPlayerSettingsOpen(false)}
      />
      <Desktop />
      <motion.div
        className="app-window"
        data-minimized={minimized}
        onClick={minimized ? () => dispatch(setMinimized(false)) : undefined}
        animate={minimized ? { scale: 0.52, y: '-8%', borderRadius: 16 } : { scale: 1, y: 0, borderRadius: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ transformOrigin: 'center' }}
      >
        <div className="header-app">
          <span className="header-spacer"></span>
          <AppSwitcher />
          <span className="header-spacer">
            <NotificationsButton />
            <AccountMenu />
          </span>
        </div>
        <div className="outter-border">
          <div className="app-container">
            <div className="dashboard-container">
              <nav className="nav-container" ref={navRef}>
                <aside className="aside-container">
                  <div className="aside-inner-container">
                    <TabBar showMenu={showMenu} setShowMenu={setShowMenu} />
                    <AnimatePresence>
                      {showMenu && <LateralMenu onNavigate={() => { if (window.matchMedia('(max-width: 1024px)').matches) setShowMenu(false); }} />}
                    </AnimatePresence>
                  </div>
                </aside>
              </nav>

              <div className="app-viewer">
                <Outlet />
                <ReaderSettings />
                <EditorSettings />
                <PdfUploadQueue />
              </div>
            </div>
            {documentLoaded && (
              <div className="audioplayer-container">
                {selectedVoice.type === 'browser'
                  ? <BrowserPlayer showVoiceSelectorModal={setIsVoiceSelectorOpen} showPlayerConfigModal={setIsPlayerSettingsOpen} />
                  : <AudioPlayer showVoiceSelectorModal={setIsVoiceSelectorOpen} showPlayerConfigModal={setIsPlayerSettingsOpen} />}
              </div>
            )}
            <LogoutModal />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
