import s from './UserPresentation.module.css';
import skeleton from '../Loader/Skeleton.module.css';
import { UserStats } from '../UserStats/UserStats';
import { LibraryCharts } from '../LibraryCharts/LibraryCharts';
import { userData } from '../../../interfaces';

export const UserPresentation = (props: { userData: userData }) => {
  const { userData } = props;
  const { loader, profilePic, username, email } = userData || {};

  return (
    <div className={s.container}>
      <div className={s.header}>
        <ul>
          <li className={`${s.imgContainer} ${loader ? s.borderAnimate : ''}`}>
            <span className={`${s.imageContainer} ${loader ? skeleton.skeleton : ''}`}>
              {
                !loader && (
                  profilePic
                    ? <img src={profilePic} alt="User image" className={s.image} />
                    : <span>{username ? username[0] : ''}</span>
                )
              }
            </span>
          </li>
        </ul>
        <ul className={s.details}>
          <li className={`${s.title} ${loader ? skeleton.skeleton : ''}`}>
            {!loader && <h1>{username}</h1>}
          </li>

          <li className={`${loader ? skeleton.skeleton : ''}`}>
            {!loader && <p>{email}</p>}
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
