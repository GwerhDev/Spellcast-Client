import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../features/Sidebar/Sidebar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../features/AudioPlayer';
import { SpellProcessor } from '../features/SpellProcessor';
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
import { SpellUploadWorker } from '../features/SpellUploadWorker';
import { PdfUploadQueue } from '../components/PdfUploadQueue';
import { NotificationsButton } from '../features/NotificationsButton';
import { Desktop } from '../features/Desktop';
import { useAppDispatch } from 'store/hooks';
import { setMinimized } from 'store/desktopSlice';
import { setSidebarCollapsed } from 'store/layoutSlice';
import { invalidateSpellList } from 'store/spellReaderSlice';
import { useAttentionGuard } from '../../hooks/useAttentionGuard';
import { useStorageQuotaWarning } from '../../hooks/useStorageQuotaWarning';
import { AttentionGuardModal } from '../components/Modals/AttentionGuardModal';
import { onSpellsMigrated } from '../../db';
import { useMode3D } from '../../context/Mode3DContext';

// TCORE-124: the app's ONE shared 3D canvas for cover-frame corners -- mounted once here
// (not per-route) so every card everywhere that opts into 3D corners (via SpellCard's own
// show3D prop) shares the same WebGL context via drei's <View>, instead of each route
// mounting/tearing down its own canvas on every navigation. Lazy because
// three/@react-three/fiber/drei are a real bundle cost that a session with the Mode3D
// setting off (the default) should never pay for -- see CoverFrame3DRoot's own comment for
// why <View> replaced an earlier "one canvas per section" design.
const CoverFrame3DRoot = lazy(() =>
  import('../components/Cover3D/CoverFrame3DRoot').then(m => ({ default: m.CoverFrame3DRoot }))
);

export default function DefaultLayout() {
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { isLoaded: documentLoaded } = useSelector((state: RootState) => state.spellReader);
  const minimized = useSelector((state: RootState) => state.desktop.minimized);
  const dispatch = useAppDispatch();
  const { showModal: showAttentionGuard, handleContinue: handleAttentionGuardContinue } = useAttentionGuard();
  useStorageQuotaWarning();
  // TCORE-124: the shared 3D canvas only mounts (and its lazy chunk only downloads) once
  // the user's own toggle is on -- see CoverFrame3DRoot's own comment. The remaining
  // desktop/motion/low-end/per-card-visibility conditions are each individual card's own
  // concern (SpellCard's show3D prop, from useCoverFrame3DGate), not this root's.
  const { enabled: mode3dEnabled } = useMode3D();
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
      <SpellProcessor />
      <SpellUploadWorker />
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
      <div className="app-window">
        <div className="header-app">
          <span className="header-spacer"></span>
          <AppSwitcher />
          <span className="header-spacer">
            <NotificationsButton />
            <AccountMenu />
          </span>
        </div>
        <motion.div
          className="app-container"
          data-minimized={minimized}
          onClick={minimized ? () => dispatch(setMinimized(false)) : undefined}
          animate={minimized ? { scale: 0.52, y: '-8%', borderRadius: 16 } : { scale: 1, y: 0, borderRadius: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          style={{ transformOrigin: 'center' }}
        >
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
              {/* TCORE-124: absolutely positioned to fill .app-viewer (already
                  position: relative) -- a sibling of <Outlet />, not a descendant of the
                  sidebar, so it never overlaps it (see CoverFrame3DRoot's own comment on
                  why the earlier position: fixed-to-viewport design did). pointer-events:
                  none on the canvas itself keeps every card's own interactions working. */}
              {mode3dEnabled && (
                <Suspense fallback={null}>
                  <CoverFrame3DRoot />
                </Suspense>
              )}
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
        </motion.div>
      </div>
    </main>
  );
}
