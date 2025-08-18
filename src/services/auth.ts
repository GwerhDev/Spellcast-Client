import { API_BASE } from '../config/api';

export async function fetchAuth() {
  try {
    const res = await fetch(`${API_BASE}/account`, {
      credentials: 'include',
    });
  
    if (!res.ok) return { logged: false };
    return await res.json();
    
  } catch (error) {
    console.error(error);
    return { logged: false };
  }
}

export async function fetchLogout() {
  try {
    const res = await fetch(`${API_BASE}/logout`, {
      credentials: 'include',
    });

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
