import { NHEXA_API } from '../config/api';

export type App = { label: string; url: string; icon: string; color?: string };

export const getAppList = async (): Promise<App[]> => {
  const r = await fetch(`${NHEXA_API}/streamby/68e0e3e992756fbbd2478f2e/get-export/app-list`, { credentials: 'include' });
  const data = await r.json();
  return data.user ?? [];
};
