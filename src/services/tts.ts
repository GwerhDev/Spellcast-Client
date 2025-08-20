import { API_BASE } from "../config/api";

export const textToSpeechService = async (formData: FormData) => {
  try {
    const response = await fetch(`${API_BASE}/tts/`, {
      credentials: 'include',
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
