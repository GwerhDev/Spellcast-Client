import s from './UserStats.module.css';
import { useNavigate } from 'react-router-dom';

export const UserStats = () => {
  const navigate = useNavigate();

  const handleMembersClick = () => {
    navigate(`/user/dashboard/groups`);
  };

  const handleExportsClick = () => {
    navigate(`/user/dashboard/shared`);
  };

  return (
    <div className={s.statsContainer}>
      <div className={`${s.statCard} ${s.clickable}`} onClick={handleMembersClick}>
        <h4>Groups</h4>
      </div>
      <div className={`${s.statCard} ${s.clickable}`} onClick={handleExportsClick}>
        <h4>Shared</h4>
        <p></p>
      </div>
    </div>
  );
};
