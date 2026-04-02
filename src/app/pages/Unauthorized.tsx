import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { UnauthorizedForm } from '../components/Forms/UnauthorizedForm';
import { CLIENT_BASE, VITE_ENV, REDIRECT_LOGIN, APP_ID } from '../../config/api';

export const Unauthorized = () => {
  const { logged } = useSelector((state: RootState) => state.session);
  const navigate = useNavigate();

  useEffect(() => {
    if (logged) {
      navigate('/');
    } else {
      if (VITE_ENV !== "development") window.location.href = REDIRECT_LOGIN + "?callback=" + encodeURIComponent(CLIENT_BASE) + "&appId=" + APP_ID;
    }
  }, [logged, navigate]);

  if (VITE_ENV === "development") return (
    <div className="dashboard-sections">
      <UnauthorizedForm />
    </div>
  )
}
