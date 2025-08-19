import s from './LateralMenu.module.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faChevronDown, faGear, faTableColumns } from '@fortawesome/free-solid-svg-icons';
import { dashboardDirectoryList, settingsDirectoryList, storageDirectoryList } from '../../../config/consts';
import { CustomCanvas } from '../Canvas/CustomCanvas';

export const LateralMenu = () => {
  const [showCanvas, setShowCanvas] = useState(false);

  return (
    <div className={s.container}>
      <div className={s.titleButton}>
        <span className={s.title} onClick={() => setShowCanvas(true)}>
          <h4>
            Library
          </h4>
          <FontAwesomeIcon icon={faChevronDown} />
        </span>
        <CustomCanvas showCanvas={showCanvas} setShowCanvas={setShowCanvas}>
          <ul className={s.projectActionsContainer}>
            <li className={s.listButton}>
              <FontAwesomeIcon icon={faGear} />
              Library Settings
            </li>
          </ul>
        </CustomCanvas>
      </div>
      <div className={s.outterMenuContainer}>
        <div className={s.menuContainer}>
          <div className={s.mainMenu}>
            <h5>MAIN MENU</h5>
            <span className={`${s.section} ${location.pathname.startsWith(`/library/dashboard`) ? s.activeLink : ''}`}>
              <Link to={`/library/dashboard`}>
                <h4>DASHBOARD</h4>
              </Link>
              <FontAwesomeIcon icon={faTableColumns} />
            </span>
          </div>
          
          <ul className={s.menuList}>
            {
              dashboardDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/library/${path}`;
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
            <Link to={`/library/storage`}>
              <h4>STORAGE</h4>
            </Link>
            <FontAwesomeIcon icon={faBox} />
          </span>
          <ul className={s.menuList}>
            {
              storageDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/library/${path}`;
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

          <span className={`${s.section} ${location.pathname.startsWith(`/library/settings`) ? s.activeLink : ''}`}>
            <Link to={`/library/settings`}>
              <h4>SETTINGS</h4>
            </Link>
            <FontAwesomeIcon icon={faGear} />
          </span>
          <ul className={s.menuList}>
            {
              settingsDirectoryList.map(({ name, icon, path }, index) => {
                const linkPath = `/library/${path}`;
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
