import { Routes, Route } from 'react-router-dom';
import { RootState } from './store';
import { useSelector, } from 'react-redux';
import { useState } from 'react';
import { userData } from './interfaces';
import { useInitSession } from './hooks/useInitSession';
import { Toast } from './app/components/Toast';
import { Loader } from './app/components/Loader';
import { RootBackground } from './app/components/Backgrounds/RootBackground';
import { Home } from './app/pages/Home';
import { Audios } from './app/pages/Audios';
import { Library } from './app/pages/Library';
import { Storage } from './app/pages/Storage';
import { Overview } from './app/pages/Overview';
import { NotFound } from './app/pages/NotFound';
import { Settings } from './app/pages/Settings';
import { Dashboard } from './app/pages/Dashboard';
import { UserGroups } from './app/pages/UserGroups';
import { Appearance } from './app/pages/Appearance';
import { UserArchive } from './app/pages/UserArchive';
import { ThemeProvider } from './context/ThemeContext';
import { Unauthorized } from './app/pages/Unauthorized';
import { DocumentCreate } from './app/pages/DocumentCreate';
import { DocumentEdit } from './app/pages/DocumentEdit';
import { DocumentDetailPage } from './app/pages/DocumentDetail';
import { UserCredentials } from './app/pages/UserCredentials';
import { LocalDocumentReader } from './app/pages/LocalDocumentReader';
import DefaultLayout from './app/layouts/DefaultLayout';

function App() {
  const userData: userData = useSelector((state: RootState) => state.session.userData);
  const { loader } = userData || {};
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderMessage, setLoaderMessage] = useState('');
  useInitSession(setLoaderProgress, setLoaderMessage);

  return (
    <ThemeProvider>
      {
        loader
          ?
          <Loader progress={loaderProgress} message={loaderMessage} />
          :
          <Routes>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route element={<DefaultLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/document/create" element={<DocumentCreate />} />
              <Route path="/document/:id" element={<DocumentDetailPage />} />
              <Route path="/document/:id/reader" element={<LocalDocumentReader />} />
              <Route path="/document/:id/edit" element={<DocumentEdit />} />
              <Route path="/document/:id/edit/:page" element={<DocumentEdit />} />
              <Route path="/user/archive" element={<UserArchive />} />

              <Route path="/user/dashboard" element={<Dashboard />} />
              <Route path="/user" element={<RootBackground />} />
              <Route path="/user/dashboard/overview" element={<Overview />} />
              <Route path="/user/dashboard/groups" element={<UserGroups />} />

              <Route path="/user/storage" element={<Storage />} />
              <Route path="/user/storage/library" element={<Library />} />
              <Route path="/user/storage/audios" element={<Audios />} />

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
      }
      <Toast />
    </ThemeProvider>
  );
}

export default App;

