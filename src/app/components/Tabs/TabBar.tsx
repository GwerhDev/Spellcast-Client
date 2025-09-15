import s from './TabBar.module.css';
import { faCompass, faHome, faUser } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '../../../interfaces';
import { TabButton } from '../Buttons/TabButton';

interface TabBarProps {
  setShowMenu: (e: boolean) => void;
};

export const TabBar = (props: TabBarProps) => {
  const { setShowMenu } = props;

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
