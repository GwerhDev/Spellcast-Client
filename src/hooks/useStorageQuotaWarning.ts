import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { useLanguage } from '../i18n';
import { getStorageEstimate, QUOTA_WARNING_RATIO } from '../utils/storageQuota';

// TCORE-117: ambient, session-wide warning once local storage usage crosses
// QUOTA_WARNING_RATIO -- gives the user a chance to free up space before the next PDF
// import or audio generation actually hits QuotaExceededError. Mounted once in
// DefaultLayout (same pattern as useInitSession/useAttentionGuard), so this check runs
// once per app session rather than once per route.
export function useStorageQuotaWarning() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();

  useEffect(() => {
    getStorageEstimate().then((estimate) => {
      if (estimate && estimate.ratio >= QUOTA_WARNING_RATIO) {
        dispatch(addApiResponse({ message: t.storage.quotaWarning, type: 'error' }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
