import { useNavigate } from 'react-router-dom';
import { UnauthorizedForm } from '../components/Forms/UnauthorizedForm';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const Unauthorized = () => {
  const session = useSelector((state: RootState) => state.session);
  const { logged } = session;
  const navigate = useNavigate();

  useEffect(() => {
    if (logged) {
      navigate('/');
    }
  }, [logged, navigate]);

  return (
    <div className='d-flex h-full justify-content-center align-items-center flex-dir-col'>
      <UnauthorizedForm />
    </div>
  )
}
