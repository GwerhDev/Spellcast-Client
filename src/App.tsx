import { Routes, Route } from 'react-router-dom';
import { RootState } from './store';
import { useSelector } from 'react-redux';
import { userData } from './interfaces';
import { useInitSession } from './hooks/useInitSession';
import { Loader } from './app/components/Loader';
import { Toast } from './app/components/Toast/Toast';
import { RootBackground } from './app/components/Backgrounds/RootBackground';
import { Home } from './app/pages/Home';
import { Audios } from './app/pages/Audios';
import { Groups } from './app/pages/Groups';
import { Library } from './app/pages/Library';
import { Storage } from './app/pages/Storage';
import { Overview } from './app/pages/Overview';
import { NotFound } from './app/pages/NotFound';
import { Settings } from './app/pages/Settings';
import { Dashboard } from './app/pages/Dashboard';
import { UserArchive } from './app/pages/UserArchive';
import { Unauthorized } from './app/pages/Unauthorized';
import { UserCredentials } from './app/pages/UserCredentials';
import DefaultLayout from './app/layouts/DefaultLayout';

function App() {
  const userData: userData = useSelector((state: RootState) => state.session.userData);
  const { loader } = userData || {};
  useInitSession();

  return (
    <>
      {
        loader
          ?
          <Loader />
          :
          <Routes>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route element={<DefaultLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/user/archive" element={<UserArchive />} />

              <Route path="/user" element={<RootBackground />}></Route>
              <Route path="/user/dashboard" element={<Dashboard />} />
              <Route path="/user/dashboard/overview" element={<Overview />} />
              <Route path="/user/dashboard/groups" element={<Groups />} />

              <Route path="/user/storage" element={<Storage />} />
              <Route path="/user/storage/library" element={<Library />} />
              <Route path="/user/storage/audios" element={<Audios />} />

              <Route path="/user/settings" element={<Settings />} />
              <Route path="/user/settings/credentials" element={<UserCredentials />} />
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
    </>
  );
}

export default App;
