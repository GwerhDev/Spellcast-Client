import { API_BASE } from '../config/api';
import { fetchWithRefresh } from './fetchWithRefresh';

export async function fetchAuth() {
  try {
    const res = await fetchWithRefresh(`${API_BASE}/accounts/`);
    if (!res.ok) return { logged: false };
    return await res.json();
  } catch (error) {
    console.error(error);
    return { logged: false };
  }
}

export async function fetchLogout() {
  try {
    const res = await fetchWithRefresh(`${API_BASE}/logout/`);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
