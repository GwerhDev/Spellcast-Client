import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../features/Sidebar/Sidebar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../features/AudioPlayer';
import { PdfProcessor } from '../components/PdfProcessor/PdfProcessor';
import { BrowserPlayer } from '../features/BrowserPlayer';
import { RootState } from 'store/index';
import { useSelector } from 'react-redux';
import { SearcherModal } from '../components/Modals/SearcherModal';
import { PlayerSettings } from '../components/Modals/PlayerSettings';
import { ReaderSettings } from '../components/SpellReader/ReaderSettings';
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
import { setSidebarCollapsed } from 'store/layoutSlice';
import { invalidateSpellList } from 'store/pdfReaderSlice';
import { useAttentionGuard } from '../../hooks/useAttentionGuard';
import { AttentionGuardModal } from '../components/Modals/AttentionGuardModal';
import { onSpellsMigrated } from '../../db';

export default function DefaultLayout() {
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { isLoaded: documentLoaded } = useSelector((state: RootState) => state.pdfReader);
  const minimized = useSelector((state: RootState) => state.desktop.minimized);
  const dispatch = useAppDispatch();
  const { showModal: showAttentionGuard, handleContinue: handleAttentionGuardContinue } = useAttentionGuard();
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // TCORE-78: the documents->spells IndexedDB migration runs silently in the
  // background after the DB opens. If a spell list already rendered (empty or
  // stale) before the copy landed, this is what tells it to refetch — otherwise
  // it would keep showing whatever it fetched first until an unrelated action
  // happened to invalidate it, which would look like data loss even though
  // nothing was lost. Mounted once here since DefaultLayout wraps every route.
  useEffect(() => {
    onSpellsMigrated(() => dispatch(invalidateSpellList()));
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!window.matchMedia('(max-width: 1024px)').matches) return;
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        dispatch(setSidebarCollapsed(true));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

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
        <div className="app-container">
          <div className="dashboard-container">
            <nav className="nav-container" ref={navRef}>
              <aside className="aside-container">
                <div className="aside-inner-container">
                  <Sidebar onNavigate={() => { if (window.matchMedia('(max-width: 1024px)').matches) dispatch(setSidebarCollapsed(true)); }} />
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
          <AttentionGuardModal show={showAttentionGuard} onContinue={handleAttentionGuardContinue} />
        </div>
      </motion.div>
    </main>
  );
}
