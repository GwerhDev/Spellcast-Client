import { API_BASE } from '../config/api';
import { Voice } from '../interfaces';

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
}

const injectDefaultVoice = (node: TiptapNode, voice: string): TiptapNode => {
  if (node.type === 'text') {
    const hasTtsMark = node.marks?.some(m => m.type === 'tts');
    if (!hasTtsMark) {
      return {
        ...node,
        marks: [...(node.marks ?? []), { type: 'tts', attrs: { voice } }],
      };
    }
    return node;
  }
  if (node.content) {
    return { ...node, content: node.content.map(n => injectDefaultVoice(n, voice)) };
  }
  return node;
};

export async function getVoicesByCredential(credentialId: string): Promise<Voice[]> {
  try {
    const response = await fetch(`${API_BASE}/user/voices/${credentialId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.error(`Failed to fetch voices for credential ${credentialId}. Status: ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing voices:', error);
    return [];
  }
}

export async function textToSpeechService(data: { text: string; voice: string }): Promise<string> {
  try {
    let doc: TiptapNode;
    try {
      doc = JSON.parse(data.text);
    } catch {
      doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: data.text }] }] };
    }

    const body = injectDefaultVoice(doc, data.voice);

    const response = await fetch(`${API_BASE}/tts/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
