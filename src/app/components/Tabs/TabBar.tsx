import s from './TabBar.module.css';
import { faBookOpen, faCompass, faHome } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '../../../interfaces';
import { TabButton } from '../Buttons/TabButton';

interface TabBarProps {
  showMenu?: boolean,
  setShowMenu: (e: boolean) => void;
};

export const TabBar = (props: TabBarProps) => {
  const { setShowMenu, showMenu } = props;

  const tabList: Tab[] = [
    {
      title: 'Home',
      route: '/',
      icon: faHome,
      showMenu: false,
    }, {
      title: 'Menu',
      route: null,
      type: "menu",
      icon: faBookOpen,
      showMenu: !showMenu,
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
