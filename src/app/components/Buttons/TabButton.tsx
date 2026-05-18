import s from './TabButton.module.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tab } from '../../../interfaces';

export const TabButton = (props: { tab: Tab, loading: boolean, setShowMenu: (e: boolean) => void; }) => {
  const { tab, setShowMenu } = props || {};
  const { title, icon, route, showMenu, type } = tab || {};
  const navigate = useNavigate();

  const handleOnClick = () => {
    setShowMenu(showMenu);
    if (route) navigate(route);
  };

  const isRouteActive = !!route && (location.pathname === route || location.pathname.startsWith(`${route}/`));
  const isMenuActive = type === "menu" && !showMenu;

  const container = `${s.container}${isRouteActive ? ` ${s.selected}` : isMenuActive ? ` ${s.menuSelected}` : ''}`;

  return (
    <button title={title} onClick={handleOnClick} className={container}>
      {icon && <FontAwesomeIcon icon={icon} size='lg' />}
    </button>
  );
};
