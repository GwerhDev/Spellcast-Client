import s from './TabBar.module.css';
import { faBars, faBuildingColumns, faCompass, faFeatherPointed, faHome } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '../../../interfaces';
import { TabButton } from '../Buttons/TabButton';
import { useLanguage } from '../../../i18n';

interface TabBarProps {
  showMenu?: boolean,
  setShowMenu: (e: boolean) => void;
};

export const TabBar = (props: TabBarProps) => {
  const { setShowMenu, showMenu } = props;
  const { t } = useLanguage();

  const tabList: Tab[] = [
    {
      title: t.nav.home,
      route: '/',
      icon: faHome,
      showMenu: false,
    }, {
      title: t.nav.library,
      route: '/library',
      icon: faBuildingColumns,
      showMenu: false,
    }, {
      title: 'Editor',
      route: '/editor',
      icon: faFeatherPointed,
      showMenu: false,
    }, {
      title: 'Explore',
      route: '/explore',
      icon: faCompass,
      showMenu: false,
    }
  ];

  const menuTab: Tab = {
    title: 'Menu',
    route: null,
    type: 'menu',
    icon: faBars,
    showMenu: !showMenu,
  };

  return (
    <div className={s.container}>
      <ul className={s.tabs}>
        {tabList.map((tab: Tab, index: number) => (
          <li key={index}>
            <TabButton setShowMenu={setShowMenu} tab={tab} loading={false} />
          </li>
        ))}
      </ul>
      <div className={s.menuButton}>
        <TabButton setShowMenu={setShowMenu} tab={menuTab} loading={false} />
      </div>
    </div>
  );
};
