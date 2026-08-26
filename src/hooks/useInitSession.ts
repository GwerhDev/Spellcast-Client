import { useEffect } from 'react';
import { fetchAuth } from '../services/auth';
import { addApiResponse } from '../store/apiResponsesSlice';
import { getCredentials, setCurrentCredentialId } from '../store/credentialsSlice';
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
        // Without this, the browser treats IndexedDB (spells, preferences, audio
        // cache) as "best-effort" storage, which it can silently evict under disk
        // pressure with no warning -- confirmed in production via DevTools showing
        // "Es persistente: No" on a database that had lost all its records. This
        // requests the "persistent" storage bucket, which browsers exempt from
        // that eviction. Never throws/rejects on unsupported browsers; the
        // request can also simply be denied (heuristic, no user prompt) -- either
        // way this is a best-effort ask, not a guarantee, so failures are ignored.
        navigator.storage?.persist?.().catch(() => {});
      }
      onProgress?.(100);
      onMessage?.('');
      dispatch(setSession(session));
      // Active credential comes from the user profile (backend: TCORE-50).
      dispatch(setCurrentCredentialId(session.userData?.current_credential ?? null));
      if (session.userData?.id) dispatch(loadVoicePreference(session.userData.id));
      setTimeout(() => dispatch(setLoader(false)), 400);
    })();
  }, [dispatch]);
}
