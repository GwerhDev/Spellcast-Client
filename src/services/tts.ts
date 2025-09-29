import { API_BASE } from '../config/api';
import { Voice } from '../interfaces';

export async function getVoicesByCredential(credentialId: string): Promise<Voice[]> {
  try {
    const response = await fetch(`${API_BASE}/user/voices/${credentialId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.error(`Failed to fetch voices for credential ${credentialId}. Status: ${response.status}`);
      return [];
    }
    const responseData = await response.json();
    return responseData;

  } catch (error) {
    console.error('Error fetching or parsing voices:', error);
    return [];
  }
}

export async function textToSpeechService(data: { text: string; voice: string }): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
