import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuth } from '../services/auth';
import { addApiResponse } from '../store/apiResponsesSlice';
import { getCredentials } from '../store/credentialsSlice';
import { useAppDispatch } from '../store/hooks';
import { setLoader, setSession } from '../store/sessionSlice';

export function useInitSession(onProgress?: (progress: number) => void) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(setLoader(true));
    onProgress?.(0);
    (async () => {
      const session = await fetchAuth();
      onProgress?.(60);
      if (!session.logged) {
        dispatch(addApiResponse({ message: 'Authentication failed.', type: 'error' }));
        navigate('/unauthorized');
      } else {
        dispatch(addApiResponse({ message: 'Authentication successful.', type: 'success' }));
        await dispatch(getCredentials());
      }
      onProgress?.(100);
      dispatch(setSession(session));
      setTimeout(() => dispatch(setLoader(false)), 400);
    })();
    //eslint-disable-next-line
  }, [dispatch]);
}
