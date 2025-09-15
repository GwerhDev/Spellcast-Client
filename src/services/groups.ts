import { API_BASE } from '../config/api';
import { Group } from '../interfaces';

export async function createGroup(data: { name: string }) {
  try {
    const res = await fetch(`${API_BASE}/user/groups`, {
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

export async function getGroups(): Promise<Group[]> {
  try {
    const res = await fetch(`${API_BASE}/user/groups`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getGroup(groupId: string) {
  try {
    const res = await fetch(`${API_BASE}/user/groups/${groupId}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateGroup(groupId: string, data: { name: string }) {
  try {
    const res = await fetch(`${API_BASE}/user/groups/${groupId}`, {
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

export async function deleteGroup(groupId: string | undefined) {
  try {
    const res = await fetch(`${API_BASE}/user/groups/${groupId}`, {
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
