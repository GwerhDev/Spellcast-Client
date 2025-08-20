import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAuth } from '../services/auth';
import { addApiResponse } from '../store/apiResponsesSlice';
import { setLoader, setSession } from '../store/sessionSlice';

export function useInitSession() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(setLoader(true)); 
    (async () => {
      const session = await fetchAuth();
      if (!session.logged) {
        dispatch(addApiResponse({ message: 'Authentication failed.', type: 'error' }));
        navigate('/unauthorized');
      } else {
        dispatch(addApiResponse({ message: 'Authentication successful.', type: 'success' }));
      }
      dispatch(setSession(session));
      dispatch(setLoader(false));
    })();
  }, [dispatch]);
}