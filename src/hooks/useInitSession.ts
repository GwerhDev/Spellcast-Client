import { useEffect } from 'react';
import { fetchAuth } from '../services/auth';
import { addApiResponse } from '../store/apiResponsesSlice';
import { getCredentials } from '../store/credentialsSlice';
import { useAppDispatch } from '../store/hooks';
import { setLoader, setSession } from '../store/sessionSlice';
import { loadVoicePreference } from '../store/voiceSlice';
import { ACCOUNT_BASE, CLIENT_BASE } from '../config/api';

export function useInitSession(
  onProgress?: (progress: number) => void,
  onMessage?: (message: string) => void,
) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoader(true));
    onProgress?.(0);
    onMessage?.('Authenticating...');
    (async () => {
      let sim = 0;
      const interval = setInterval(() => {
        sim += (50 - sim) * 0.12;
        onProgress?.(Math.round(sim));
      }, 150);
      const session = await fetchAuth();
      clearInterval(interval);
      onProgress?.(60);
      if (!session.logged) {
        dispatch(addApiResponse({ message: 'Authentication failed.', type: 'error' }));
        window.location.href = `${ACCOUNT_BASE}/login?callback=${encodeURIComponent(CLIENT_BASE)}`;
        return;
      } else {
        dispatch(addApiResponse({ message: 'Authentication successful.', type: 'success' }));
        dispatch(getCredentials());
      }
      onProgress?.(100);
      onMessage?.('');
      dispatch(setSession(session));
      if (session.userData?.id) dispatch(loadVoicePreference(session.userData.id));
      setTimeout(() => dispatch(setLoader(false)), 400);
    })();
  }, [dispatch]);
}
