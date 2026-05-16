import s from './LogoutModal.module.css';
import { fetchLogout } from '../../../services/auth';
import { useDispatch } from 'react-redux';
import { clearSession } from '../../../store/sessionSlice';
import { LogoutForm } from '../Forms/LogoutForm';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { useLanguage } from '../../../i18n';

export const LogoutModal = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await fetchLogout();
      dispatch(addApiResponse({ message: t.auth.loggedOut, type: 'success' }));
    } catch (error: unknown) {
      let message = t.auth.logoutFailed;
      if (error instanceof Error) {
        message = error.message;
      }
      dispatch(addApiResponse({ message, type: 'error' }));
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
