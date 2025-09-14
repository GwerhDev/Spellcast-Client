import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuth } from '../services/auth';
import { addApiResponse } from '../store/apiResponsesSlice';
import { getCredentials } from '../store/credentialsSlice';
import { useAppDispatch } from '../store/hooks';
import { setLoader, setSession } from '../store/sessionSlice';

export function useInitSession() {
  const dispatch = useAppDispatch();
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
        dispatch(getCredentials());
      }
      dispatch(setSession(session));
      dispatch(setLoader(false));
    })();
    //eslint-disable-next-line
  }, [dispatch]);
}
