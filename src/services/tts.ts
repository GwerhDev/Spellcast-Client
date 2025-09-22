import { API_BASE } from '../config/api';
import { Voice } from '../interfaces';

export async function getVoicesByCredential(credentialId: string): Promise<Voice[]> {
  try {
    const res = await fetch(`${API_BASE}/user/voices/${credentialId}`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const rawVoices: string = await res.json();
    const parsableVoices = rawVoices.replace(/'/g, '"');

    const response = JSON.parse(parsableVoices).map((rawVoice: any) => ({
      value: rawVoice.ShortName,
      name: `${rawVoice.DisplayName} - ${rawVoice.LocaleName}, ${rawVoice.Gender}`,
    }));

    console.log(response)

    return response;

  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function textToSpeechService(data: { text: string; voice: string }): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/tts/generate`, {
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
    const result = await res.json();
    return result.audioUrl; // Assuming the API returns an object with an audioUrl field
  } catch (error) {
    console.error(error);
    throw error;
  }
}
