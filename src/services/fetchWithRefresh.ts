import { NHEXA_API, REDIRECT_LOGIN } from '../config/api';

let isRefreshing = false;
let queue: Array<(ok: boolean) => void> = [];

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise(resolve => queue.push(resolve));
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${NHEXA_API}/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const ok = res.ok;
    queue.forEach(resolve => resolve(ok));
    queue = [];
    return ok;
  } catch {
    queue.forEach(resolve => resolve(false));
    queue = [];
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function fetchWithRefresh(url: string, options: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = { ...options, credentials: 'include' };
  const res = await fetch(url, opts);

  if (res.status !== 401) return res;

  const refreshed = await attemptRefresh();
  if (!refreshed) {
    window.location.href = REDIRECT_LOGIN;
    return res;
  }

  return fetch(url, opts);
}
