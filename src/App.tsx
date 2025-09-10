import { Routes, Route } from 'react-router-dom';
import { RootState } from './store';
import { useSelector } from 'react-redux';
import { useInitSession } from './hooks/useInitSession';
import { Loader } from './app/components/Loader';
import { Toast } from './app/components/Toast/Toast';
import { RootBackground } from './app/components/Backgrounds/RootBackground';
import { Home } from './app/pages/Home';
import { Audios } from './app/pages/Audios';
import { Storage } from './app/pages/Storage';
import { Groups } from './app/pages/Groups';
import { Overview } from './app/pages/Overview';
import { NotFound } from './app/pages/NotFound';
import { Settings } from './app/pages/Settings';
import { Dashboard } from './app/pages/Dashboard';
import { UserAccount } from './app/pages/UserAccount';
import { UserArchive } from './app/pages/UserArchive';
import { Unauthorized } from './app/pages/Unauthorized';
import { UserConfiguration } from './app/pages/UserConfiguration';
import { userData } from './interfaces';
import DefaultLayout from './app/layouts/DefaultLayout';
import LibraryLayout from './app/layouts/LibraryLayout';

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
              <Route path="/user" element={<UserAccount />} />
              <Route path="/user/archive" element={<UserArchive />} />
              <Route path="/user/configuration" element={<UserConfiguration />} />

              <Route path="/library" element={<LibraryLayout />}>
                <Route path="/library" element={<RootBackground />} />
                <Route path="/library/dashboard" element={<Dashboard />} />
                <Route path="/library/dashboard/overview" element={<Overview />} />
                <Route path="/library/dashboard/groups" element={<Groups />} />

                <Route path="/library/storage" element={<Storage />} />
                <Route path="/library/storage/audios" element={<Audios />} />

                <Route path="/library/settings" element={<Settings />} />
                <Route path="/library/not-found" element={<NotFound />} />
                <Route path="/library/*" element={<NotFound />} />

              </Route>
              <Route path="/explore/*" element={<NotFound />} />
              <Route path="/store/*" element={<NotFound />} />
              <Route path="/library/not-found" element={<NotFound />} />
              <Route path="/library/*" element={<NotFound />} />
              <Route path="/library/not-found" element={<NotFound />} />
              <Route path="/library/*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
      }
      <Toast />
    </>
  );
}

export default App;
