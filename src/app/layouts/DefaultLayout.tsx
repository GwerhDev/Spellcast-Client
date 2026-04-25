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
import spellcastIcon from '../../assets/spellcast-logo.svg';
import { PageSelectorModal } from '../components/Modals/PageSelectorModal';
import { VoiceSelectorModal } from '../components/Modals/VoiceSelectorModal';
import { ReaderSettingsPanel } from '../components/DocumentReader/ReaderSettingsPanel';
import { EditorSettingsPanel } from '../components/EditorSettingsPanel';

export default function DefaultLayout() {
  const shouldHideMenu = location.pathname.startsWith(`/user`);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const { showReaderSettings } = useSelector((state: RootState) => state.pdfReader);
  const { showEditorSettings } = useSelector((state: RootState) => state.editor);
  const [showMenu, setShowMenu] = useState(shouldHideMenu);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
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
      <VoiceSelectorModal
        show={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
      <div className="header-app">
        <span className="title-container">
          <img src={spellcastIcon} alt="Spellcast Icon" />
          <small className="font-bold nowrap">{"Spellcast"}</small>
        </span>
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
        {showReaderSettings && <ReaderSettingsPanel />}
        {showEditorSettings && <EditorSettingsPanel />}
      </div>
      <div className="audioplayer-container">
        {selectedVoice.type === 'browser'
          ? <BrowserPlayer showVoiceSelectorModal={setIsVoiceModalOpen} />
          : <AudioPlayer showVoiceSelectorModal={setIsVoiceModalOpen} />}
      </div>
      <LogoutModal />
    </main>
  );
}
