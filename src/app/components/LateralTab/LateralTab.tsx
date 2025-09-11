import s from './LateralTab.module.css';
import { useNavigate } from 'react-router-dom';
import { faBook, faCompass, faHome, faShop, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '../../../interfaces';
import { TabButton } from '../Buttons/TabButton';
import spellcastIcon from '../../../assets/spellcast-logo.svg';

export const LateralTab = () => {

  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const tabList: Tab[] = [
    {
      title: 'Home',
      route: '/',
      icon: faHome,
    }, {
      title: 'Credentials',
      route: '/user/credentials',
      icon: faIdBadge,
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
        <img onClick={handleGoHome} src={spellcastIcon} alt="Spellcast Icon" height={25} />
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
    </div>
  );
};
