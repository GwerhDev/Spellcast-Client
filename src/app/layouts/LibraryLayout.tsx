import { Outlet, useLocation, useParams } from 'react-router-dom';
import { LogoutModal } from '../components/Modals/LogoutModal';
import { LateralMenu } from '../components/LateralMenu/LateralMenu';
import { useEffect, useState } from 'react';
import { Browser } from '../components/Browser/Browser';

export default function LibraryLayout() {

  const { id } = useParams();
  const location = useLocation();
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const shouldHideMenu = isSmallScreen && location.pathname !== `/project/${id}`;
  const shouldHideBrowser = !isSmallScreen || location.pathname !== `/project/${id}`;

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className="dashboard-sections">
        {!shouldHideMenu && <LateralMenu />}
        {
          shouldHideBrowser &&
          <Browser>
            <Outlet />
          </Browser >
        }
      </div >
      <LogoutModal />
    </>
  );
}
