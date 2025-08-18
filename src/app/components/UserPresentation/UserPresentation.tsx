import s from './UserPresentation.module.css';
import skeleton from '../Loader/Skeleton.module.css';
import { faDatabase, faTable } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UserStats } from '../UserStats/UserStats';
import { LibraryCharts } from '../LibraryCharts/LibraryCharts';

export const UserPresentation = (props: any) => {
  const { loading, image, name, dbType, description } = props || {};

  return (
    <div className={s.container}>
      <div className={s.header}>
        <ul>
          <li className={`${s.imgContainer} ${loading ? s.borderAnimate : ''}`}>
            <span className={`${s.imageContainer} ${loading ? skeleton.skeleton : ''}`}>
              {
                !loading && (
                  image
                    ? <img src={image} alt="Project image" className={s.image} />
                    : <span>{name ? name[0] : ''}</span>
                )
              }
            </span>
          </li>
          <>
            {!loading && dbType && (
              <li className={`${s.dbType} ${loading ? skeleton.skeleton : ''}`}>
                <FontAwesomeIcon icon={dbType === "sql" ? faTable : faDatabase} title={dbType} />
                <span>{dbType}</span>
              </li>
            )}
          </>
        </ul>
        <ul className={s.details}>
          <li className={`${s.title} ${loading ? skeleton.skeleton : ''}`}>
            {!loading && <h1>{name}</h1>}
          </li>

          <li className={`${loading ? skeleton.skeleton : ''}`}>
            {!loading && <p>{description}</p>}
          </li>
        </ul>
      </div>
      <div className={s.stats}>
        <UserStats />
        <LibraryCharts />
      </div>
    </div>
  );
};
