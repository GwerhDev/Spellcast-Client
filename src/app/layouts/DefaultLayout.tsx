import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../features/Sidebar/Sidebar';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { AudioPlayer } from '../features/AudioPlayer';
import { SpellProcessor } from '../features/SpellProcessor';
import { BrowserPlayer } from '../features/BrowserPlayer';
import { PlayerDock } from '../features/PlayerDock';
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
  // The player shows as soon as a spell is chosen, not only once its pages are read: the
  // title (and cover) are already known, and reading a big spell's pages can take a while.
  const { spellId: activeSpellId } = useSelector((state: RootState) => state.spellReader);
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
            </div>
            {/* TCORE-124: mounted on .dashboard-container (position: relative, see
                globals.css), NOT .app-viewer -- .app-viewer's own width reflows for ~220ms
                every time the sidebar's rail<->panel toggle animates (SidebarView.module.css's
                own `transition: width`), and that reflow left the shared root <Canvas>'s
                measured size (what drei's <View> uses to convert each card's live DOM rect
                into a WebGL scissor rect) a frame or more stale relative to the DOM -- the
                ornaments visibly detached from the cover during that window. .dashboard-
                container's own box is width:100% of .app-container, provably independent of
                how the sidebar/viewer split that width between them (see globals.css), so it
                never reflows from this. It now geometrically spans the sidebar's screen area
                too, so .nav-container gets `isolation: isolate` (globals.css) to guarantee the
                sidebar keeps painting on top regardless -- same technique this branch already
                uses on SpellCard's own .card (z-index: 0, for the identical reason). */}
            {mode3dEnabled && (
              <Suspense fallback={null}>
                <CoverFrame3DRoot />
              </Suspense>
            )}
          </div>
          {/* The player's bar, also a drop target for spells: dropping one loads it (or
              switches to it), and with nothing loaded the bar appears while a spell is dragged
              near the bottom. */}
          <PlayerDock>
            {activeSpellId && (selectedVoice.type === 'browser'
              // Keyed by spell: each spell gets a fresh player instance, as it did when the
              // player only mounted once that spell's pages were loaded.
              ? <BrowserPlayer key={activeSpellId} showVoiceSelectorModal={setIsVoiceSelectorOpen} showPlayerConfigModal={setIsPlayerSettingsOpen} />
              : <AudioPlayer key={activeSpellId} showVoiceSelectorModal={setIsVoiceSelectorOpen} showPlayerConfigModal={setIsPlayerSettingsOpen} />)}
          </PlayerDock>
          <LogoutModal />
          <AttentionGuardModal show={showAttentionGuard} onContinue={handleAttentionGuardContinue} />
        </motion.div>
      </div>
    </main>
  );
}
