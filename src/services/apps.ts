import { NHEXA_API } from '../config/api';

export type App = { label: string; url: string; icon: string; color?: string; description?: string; route?: string };
export type EnvCategory = { id: string; name: string; apps: App[] };

type RawCategory = Record<string, unknown> & { _id: string; _name: string };

function parseEnv(raw: RawCategory[]): EnvCategory[] {
  return raw.map(cat => ({
    id: cat._id,
    name: cat._name,
    apps: Object.entries(cat)
      .filter(([k]) => /^\d+$/.test(k))
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, v]) => v as App),
  }));
}

export const getNhexaEnv = async (): Promise<EnvCategory[]> => {
  const r = await fetch(`${NHEXA_API}/streamby/be4dce92-de7c-4820-8f93-b3ea3335575d/export/nhexa-environment`, { credentials: 'include' });
  const raw = await r.json() as RawCategory[];
  return parseEnv(raw);
};
