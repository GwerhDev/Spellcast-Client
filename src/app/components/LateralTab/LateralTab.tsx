import s from './LateralTab.module.css';
import { useNavigate } from 'react-router-dom';
import { faCompass, faHome, faUser } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '../../../interfaces';
import { TabButton } from '../Buttons/TabButton';
import spellcastIcon from '../../../assets/spellcast-logo.svg';

interface LateralTabProps {
  setShowMenu: (e: boolean) => void;
}

export const LateralTab = (props: LateralTabProps) => {
  const { setShowMenu } = props;
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const tabList: Tab[] = [
    {
      title: 'Home',
      route: '/',
      icon: faHome,
      showMenu: false,
    }, {
      title: 'User',
      route: '/user',
      icon: faUser,
      showMenu: true,
    }, {
      title: 'Explore',
      route: '/explore',
      icon: faCompass,
      showMenu: false,
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
              <TabButton setShowMenu={setShowMenu} tab={tab} loading={false} />
            </li>
          ))
        }
      </ul>
    </div>
  );
};
