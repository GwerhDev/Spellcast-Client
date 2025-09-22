import { API_BASE } from '../config/api';
import { TTS_Credential } from '../interfaces';

export async function createCredential(data: { azure_key: string; region: string }) {
  try {
    const res = await fetch(`${API_BASE}/user/credentials`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

export async function getCredentials(): Promise<TTS_Credential[]> {
  try {
    const res = await fetch(`${API_BASE}/user/credentials`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getCredential(credentialId: string) {
  try {
    const res = await fetch(`${API_BASE}/user/credentials/${credentialId}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateCredential(credentialId: string, data: { azure_key: string; region: string; voices?: string[] }) {
  try {
    const res = await fetch(`${API_BASE}/user/credentials/${credentialId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

export async function deleteCredential(credentialId: string | undefined) {
  try {
    const res = await fetch(`${API_BASE}/user/credentials/${credentialId}`, {
      method: 'DELETE',
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
