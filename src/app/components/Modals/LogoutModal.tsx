import s from './LogoutModal.module.css';
import { fetchLogout } from '../../../services/auth';
import { useDispatch } from 'react-redux';
import { clearSession } from '../../../store/sessionSlice';
import { LogoutForm } from '../Forms/LogoutForm';
import { addApiResponse } from '../../../store/apiResponsesSlice';

export const LogoutModal = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await fetchLogout();
      dispatch(addApiResponse({ message: 'Logged out successfully.', type: 'success' }));
    } catch (error: any) {
      dispatch(addApiResponse({ message: error.message || 'Failed to log out.', type: 'error' }));
    } finally {
      const logoutModal = document.getElementById('logout-modal') as HTMLDivElement | null;
      if (logoutModal) logoutModal.style.display = 'none';
      dispatch(clearSession());
    }
  };

  const handleCancelLogout = () => {
    const logoutModal = document.getElementById('logout-modal') as HTMLDivElement | null;
    if (logoutModal) {
      logoutModal.style.display = 'none';
    }
  };

  return (
    <div className={s.container} id='logout-modal'>
      <LogoutForm handleLogout={handleLogout} handleCancelLogout={handleCancelLogout} />
    </div>
  );
};
