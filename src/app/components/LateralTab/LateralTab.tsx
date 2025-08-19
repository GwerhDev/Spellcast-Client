import s from './LateralTab.module.css';
import { useNavigate } from 'react-router-dom';
import { faArchive, faBook, faCompass, faHome, faShop } from '@fortawesome/free-solid-svg-icons';
import { Tab, userData } from '../../../interfaces';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TabButton } from '../Buttons/TabButton';
import { ProfileButton } from '../Buttons/ProfileButton';
import streambyIcon from '../../../assets/streamby-icon.svg';

export const LateralTab = (props: { userData: userData }) => {
  const { userData } = props || {};

  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoArchive = () => {
    navigate("/user/archive");
  };

  const tabList: Tab[] = [
    {
      title: 'Home',
      route: '/',
      icon: faHome,
    }, {
      title: 'Library',
      route: '/library',
      icon: faBook,
    }, {
      title: 'Store',
      route: '/store',
      icon: faShop
    }, {
      title: 'Explore',
      route: '/explore',
      icon: faCompass
    }
  ];

  return (
    <div className={s.container}>
      <span className={s.iconContainer}>
        <img onClick={handleGoHome} src={streambyIcon} alt="StreamBy Icon" height={25} />
      </span>
      <ul className={s.tabs}>
        {
          tabList?.map((tab: Tab, index: number) => (
            <li key={index}>
              <TabButton tab={tab} loading={false} />
            </li>
          ))
        }
      </ul>

      <ul className={s.user}>
        <li className={s.archive} onClick={handleGoArchive}>
          <FontAwesomeIcon icon={faArchive} />
        </li>

        <li>
          <ProfileButton userData={userData} />
        </li>

        <li>
          <div className={s.versionContainer}>
            <small className={s.version}>{"v" + __APP_VERSION__}</small>
          </div>
        </li>
      </ul>
    </div>
  );
};
