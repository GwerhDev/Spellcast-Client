import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { useLanguage } from '../i18n';
import { getStorageEstimate, QUOTA_WARNING_RATIO } from '../utils/storageQuota';
import { evictLeastRecentlyUsedAudio, AUDIO_CACHE_AUTO_CLEANUP_KEY } from '../db/audioCache';
import { formatBytes } from '../utils/formatBytes';

// TCORE-118: how far under the warning threshold auto-cleanup tries to bring usage back
// down to, so it doesn't free just enough to immediately re-trigger the warning again on
// the very next check.
const AUTO_CLEANUP_TARGET_RATIO = 0.75;

// TCORE-117: ambient, session-wide warning once local storage usage crosses
// QUOTA_WARNING_RATIO -- gives the user a chance to free up space before the next PDF
// import or audio generation actually hits QuotaExceededError. Mounted once in
// DefaultLayout (same pattern as useInitSession/useAttentionGuard), so this check runs
// once per app session rather than once per route.
//
// TCORE-118: if the user opted into audio-cache auto-cleanup (Settings > Storage > Audio
// cache), crossing the threshold evicts least-recently-used audio first instead of only
// warning -- audio is regenerable, so this is the one storage category safe to free
// automatically without asking each time. Still surfaced via a toast either way: silent
// automatic deletion of the user's data is never appropriate, even for something
// regenerable (see the review-storage-destructive-ops caution this codebase follows).
export function useStorageQuotaWarning() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();

  useEffect(() => {
    getStorageEstimate().then(async (estimate) => {
      if (!estimate || estimate.ratio < QUOTA_WARNING_RATIO) return;

      const autoCleanupEnabled = localStorage.getItem(AUDIO_CACHE_AUTO_CLEANUP_KEY) === 'true';
      if (autoCleanupEnabled) {
        const targetBytes = estimate.usage - AUTO_CLEANUP_TARGET_RATIO * estimate.quota;
        const freed = await evictLeastRecentlyUsedAudio(targetBytes);
        if (freed > 0) {
          dispatch(addApiResponse({ message: t.storage.audioCacheAutoEvictedToast.replace('{size}', formatBytes(freed)), type: 'success' }));
        }
        // The audio cache alone might not have had enough to free -- if so, still warn so
        // the user knows they need to act manually (delete a spell, drop an original PDF).
        if (freed >= targetBytes) return;
      }

      dispatch(addApiResponse({ message: t.storage.quotaWarning, type: 'error' }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
