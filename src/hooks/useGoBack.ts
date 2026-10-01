import { useNavigate } from 'react-router-dom';

// A back button that never leaves the app: it goes back to the previous page when that page
// is one of the app's own, and to `fallback` otherwise (the page was opened directly -- a
// link from elsewhere, a reload, a new tab), e.g. the page it sits under. The router numbers
// its history entries (`idx` in history.state, 0 for the first one this app made), so above
// 0 there's an app page behind.
export const useGoBack = (fallback = '/') => {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback);
  };
};
