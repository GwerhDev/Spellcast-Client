import { useState, useEffect } from 'react';
import { RootState } from './store';
import { useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { useInitSession } from './hooks/useInitSession';

import { Toast } from './app/components/Toast';
import { Loader } from './app/components/Loader';

import { Home } from './app/pages/Home';
import { StorageLocal } from './app/pages/StorageLocal';
import { StorageCloud } from './app/pages/StorageCloud';
import { Editor } from './app/pages/Editor';
import { Grimoire } from './app/pages/Grimoire';
import { Storage } from './app/pages/Storage';
import { NotFound } from './app/pages/NotFound';
import { Settings } from './app/pages/Settings';
import { UserGroups } from './app/pages/UserGroups';
import { UserShared } from './app/pages/UserShared';
import { CasterStats } from './app/pages/CasterStats';
import { Appearance } from './app/pages/Appearance';
import { UserArchive } from './app/pages/UserArchive';
import { Unauthorized } from './app/pages/Unauthorized';
import { EditorSelect } from './app/pages/EditorSelect';
import { SpellEdit } from './app/pages/SpellEdit';
import { SpellCreate } from './app/pages/SpellCreate';
import { UserCredentials } from './app/pages/UserCredentials';
import { SpellDetailPage } from './app/pages/SpellDetail';
import { LocalSpellReader } from './app/pages/LocalSpellReader';
import { HavenStore } from './app/pages/HavenStore';
import { CasterProfile } from './app/pages/CasterProfile';
import { CasterInventory } from './app/pages/CasterInventory';

import DefaultLayout from './app/layouts/DefaultLayout';
import { CasterLayout } from './app/layouts/CasterLayout';

function App() {
  const { loader } = useSelector((state: RootState) => state.session.userData);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderExiting, setLoaderExiting] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [loaderProgress, setLoaderProgress] = useState(0);
  useInitSession(setLoaderProgress, setLoaderMessage);

  useEffect(() => {
    if (!loader && showLoader && !loaderExiting) {
      setLoaderExiting(true);
      const timer = setTimeout(() => setShowLoader(false), 500);
      return () => clearTimeout(timer);
    }
    //eslint-disable-next-line
  }, [loader]);

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/select" element={<EditorSelect />} />
          <Route path="/editor/create" element={<SpellCreate />} />
          <Route path="/editor/:id" element={<SpellEdit />} />
          <Route path="/editor/:id/:page" element={<SpellEdit />} />
          <Route path="/spell/:id" element={<SpellDetailPage />} />
          <Route path="/spell/:id/reader" element={<LocalSpellReader />} />
          <Route path="/caster/archive" element={<UserArchive />} />

          <Route path="/caster" element={<Navigate to="/caster/profile" replace />} />

          <Route element={<CasterLayout />}>
            <Route path="/caster/profile" element={<CasterProfile />} />
            <Route path="/caster/stats" element={<CasterStats />} />
            <Route path="/caster/inventory" element={<CasterInventory />} />
            <Route path="/caster/groups" element={<UserGroups />} />
            <Route path="/caster/shared" element={<UserShared />} />

            <Route path="/caster/settings" element={<Settings />} />
            <Route path="/caster/settings/credentials" element={<UserCredentials />} />
            <Route path="/caster/settings/appearance" element={<Appearance />} />
            {/* TCORE-109 (reverted): Storage lives inside Settings now, a flat item like
                Credentials/Permissions/Appearance -- not its own Inventory sub-tab. */}
            <Route path="/caster/settings/storage" element={<Storage />} />
            <Route path="/caster/settings/storage/local" element={<StorageLocal />} />
            <Route path="/caster/settings/storage/cloud" element={<StorageCloud />} />
          </Route>

          <Route path="/grimoire" element={<Grimoire />} />
          <Route path="/havenstore" element={<HavenStore />} />

          <Route path="/caster/not-found" element={<NotFound />} />
          <Route path="/caster/*" element={<NotFound />} />
          <Route path="/explore/*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showLoader && <Loader progress={loaderProgress} message={loaderMessage} exiting={loaderExiting} />}
      <Toast />
    </ThemeProvider>
  );
}

export default App;

