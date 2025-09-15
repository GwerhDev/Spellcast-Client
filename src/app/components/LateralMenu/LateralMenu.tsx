import s from './LateralMenu.module.css';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faGear, faTableColumns } from '@fortawesome/free-solid-svg-icons';
import { dashboardDirectoryList, settingsDirectoryList, storageDirectoryList } from '../../../config/consts';

export const LateralMenu = () => {
  return (
    <div className={s.container}>
      <div className={s.outterMenuContainer}>
        <div className={s.menuContainer}>
          <div className={s.mainMenu}>
            <h5>MAIN MENU</h5>
            <span className={`${s.section} ${location.pathname.startsWith(`/user/dashboard`) ? s.activeLink : ''}`}>
              <Link to={`/user/dashboard`}>
                <h4>DASHBOARD</h4>
              </Link>
              <FontAwesomeIcon icon={faTableColumns} />
            </span>
          </div>
          
          <ul className={s.menuList}>
            {
              dashboardDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/user/${path}`;
                const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
                return (
                  <Link key={index} to={linkPath}>
                    <li className={isActive ? s.activeLink : ''}>
                      {icon && <FontAwesomeIcon icon={icon} />}
                      {name}
                    </li>
                  </Link>
                );
              })
            }
          </ul>

          <span className={s.section}>
            <Link to={`/user/storage`}>
              <h4>STORAGE</h4>
            </Link>
            <FontAwesomeIcon icon={faBox} />
          </span>
          <ul className={s.menuList}>
            {
              storageDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/user/${path}`;
                const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
                return (
                  <Link key={index} to={linkPath}>
                    <li className={isActive ? s.activeLink : ''}>
                      {icon && <FontAwesomeIcon icon={icon} />}
                      {name}
                    </li>
                  </Link>
                );
              })
            }
          </ul>

          <span className={`${s.section} ${location.pathname.startsWith(`/user/settings`) ? s.activeLink : ''}`}>
            <Link to={`/user/settings`}>
              <h4>SETTINGS</h4>
            </Link>
            <FontAwesomeIcon icon={faGear} />
          </span>
          <ul className={s.menuList}>
            {
              settingsDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/user/${path}`;
                const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
                return (
                  <Link key={index} to={linkPath}>
                    <li className={isActive ? s.activeLink : ''}>
                      {icon && <FontAwesomeIcon icon={icon} />}
                      {name}
                    </li>
                  </Link>
                );
              })
            }
          </ul>
        </div>
      </div>
    </div >
  )
}
