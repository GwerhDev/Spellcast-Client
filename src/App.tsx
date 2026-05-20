import { useState, useEffect } from 'react';
import { RootState } from './store';
import { useSelector } from 'react-redux';
import { Routes, Route } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { useInitSession } from './hooks/useInitSession';

import { Toast } from './app/components/Toast';
import { Loader } from './app/components/Loader';
import { RootBackground } from './app/components/Backgrounds/RootBackground';

import { Home } from './app/pages/Home';
import { StorageLocal } from './app/pages/StorageLocal';
import { StorageCloud } from './app/pages/StorageCloud';
import { Editor } from './app/pages/Editor';
import { Library } from './app/pages/Library';
import { Storage } from './app/pages/Storage';
import { Overview } from './app/pages/Overview';
import { NotFound } from './app/pages/NotFound';
import { Settings } from './app/pages/Settings';
import { Dashboard } from './app/pages/Dashboard';
import { UserGroups } from './app/pages/UserGroups';
import { Appearance } from './app/pages/Appearance';
import { UserArchive } from './app/pages/UserArchive';
import { Unauthorized } from './app/pages/Unauthorized';
import { EditorSelect } from './app/pages/EditorSelect';
import { DocumentEdit } from './app/pages/DocumentEdit';
import { DocumentCreate } from './app/pages/DocumentCreate';
import { UserCredentials } from './app/pages/UserCredentials';
import { DocumentDetailPage } from './app/pages/DocumentDetail';
import { LocalDocumentReader } from './app/pages/LocalDocumentReader';

import DefaultLayout from './app/layouts/DefaultLayout';

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
          <Route path="/editor/create" element={<DocumentCreate />} />
          <Route path="/editor/:id" element={<DocumentEdit />} />
          <Route path="/editor/:id/:page" element={<DocumentEdit />} />
          <Route path="/document/:id" element={<DocumentDetailPage />} />
          <Route path="/document/:id/reader" element={<LocalDocumentReader />} />
          <Route path="/user/archive" element={<UserArchive />} />

          <Route path="/user/dashboard" element={<Dashboard />} />
          <Route path="/user" element={<RootBackground />} />
          <Route path="/user/dashboard/overview" element={<Overview />} />
          <Route path="/user/dashboard/groups" element={<UserGroups />} />

          <Route path="/library" element={<Library />} />

          <Route path="/user/storage" element={<Storage />} />
          <Route path="/user/storage/local" element={<StorageLocal />} />
          <Route path="/user/storage/cloud" element={<StorageCloud />} />

          <Route path="/user/settings" element={<Settings />} />
          <Route path="/user/settings/credentials" element={<UserCredentials />} />
          <Route path="/user/settings/appearance" element={<Appearance />} />
          <Route path="/user/not-found" element={<NotFound />} />
          <Route path="/user/*" element={<NotFound />} />
          <Route path="/explore/*" element={<NotFound />} />
        </Route>
        <Route path="/user/not-found" element={<NotFound />} />
        <Route path="/user/*" element={<NotFound />} />
        <Route path="/user/not-found" element={<NotFound />} />
        <Route path="/user/*" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showLoader && <Loader progress={loaderProgress} message={loaderMessage} exiting={loaderExiting} />}
      <Toast />
    </ThemeProvider>
  );
}

export default App;

