import s from './TabButton.module.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tab } from '../../../interfaces';

export const TabButton = (props: { tab: Tab, loading: boolean }) => {
  const { tab } = props || {};
  const { title, icon, route } = tab || {};
  const navigate = useNavigate();

  const handleOnClick = () => {
    navigate(route);
  };

  const isActive = location.pathname === route || location.pathname.startsWith(`${route}/`);

  const container = isActive ? `${s.container} ${s.selected}` : s.container;

  return (
    <button title={title} onClick={handleOnClick} className={container}>
      {icon && <FontAwesomeIcon icon={icon} size='lg' />}
    </button>
  );
};
