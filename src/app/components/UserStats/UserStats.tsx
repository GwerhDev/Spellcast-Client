import s from './UserStats.module.css';
import { useNavigate } from 'react-router-dom';

export const UserStats = () => {
  const navigate = useNavigate();

  const handleMembersClick = () => {
    navigate(`/library/dashboard/groups`);
  };

  const handleExportsClick = () => {
    navigate(`/library/dashboard/exports`);
  };

  return (
    <div className={s.statsContainer}>
      <div className={`${s.statCard} ${s.clickable}`} onClick={handleMembersClick}>
        <h4>Members</h4>
      </div>
      <div className={`${s.statCard} ${s.clickable}`} onClick={handleExportsClick}>
        <h4>Exports</h4>
        <p></p>
      </div>
    </div>
  );
};
