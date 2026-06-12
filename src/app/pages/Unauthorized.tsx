import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { UnauthorizedForm } from '../components/Forms/UnauthorizedForm';
import { CLIENT_BASE, ACCOUNT_BASE } from '../../config/api';

export const Unauthorized = () => {
  const { logged } = useSelector((state: RootState) => state.session);
  const navigate = useNavigate();

  useEffect(() => {
    if (logged) {
      navigate('/');
    } else {
      window.location.href = `${ACCOUNT_BASE}/login?callback=${encodeURIComponent(CLIENT_BASE)}`;
    }
  }, [logged, navigate]);

  return null;
}
