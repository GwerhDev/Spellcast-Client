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

export interface TtsSegment {
  text: string;
  voice: string;
  inflection: string;
}

export interface TimelineEntry {
  text: string;
  start: number;
  end: number;
}

const getNodeText = (node: TiptapNode): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return ' ';
  return (node.content ?? []).map(getNodeText).join('');
};

const getNodeVoice = (node: TiptapNode, defaultVoice: string): string => {
  if (node.type === 'text') {
    const mark = node.marks?.find(m => m.type === 'tts');
    const v = mark?.attrs?.voice as string | undefined;
    if (v && v !== 'default') return v;
  }
  for (const child of node.content ?? []) {
    const v = getNodeVoice(child, defaultVoice);
    if (v !== defaultVoice) return v;
  }
  return defaultVoice;
};

const getNodeInflection = (node: TiptapNode): string => {
  if (node.type === 'text') {
    const mark = node.marks?.find(m => m.type === 'tts');
    const inf = mark?.attrs?.inflection as string | undefined;
    if (inf && inf !== 'default') return inf;
  }
  for (const child of node.content ?? []) {
    const inf = getNodeInflection(child);
    if (inf !== 'default') return inf;
  }
  return 'default';
};

export function buildSegments(docText: string, defaultVoice: string): TtsSegment[] {
  let doc: TiptapNode;
  try {
    doc = JSON.parse(docText);
  } catch {
    doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: docText }] }] };
  }

  const segments: TtsSegment[] = [];

  for (const node of doc.content ?? []) {
    if (node.type !== 'paragraph' && node.type !== 'heading') continue;
    const rawText = getNodeText(node).trim();
    if (!rawText) continue;

    const voice = getNodeVoice(node, defaultVoice);
    const inflection = getNodeInflection(node);

    const sentences = rawText.split(/(?<=[.!?])(?!\s*\.)/).map(s => s.trim()).filter(Boolean);
    for (const text of sentences) {
      segments.push({ text, voice, inflection });
    }
  }

  if (segments.length === 0) {
    const fallback = (doc.content ?? []).map(getNodeText).join(' ').trim();
    if (fallback) segments.push({ text: fallback, voice: defaultVoice, inflection: 'default' });
  }

  return segments;
}

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

export async function textToSpeechService(
  data: { text: string; voice: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; timeline: TimelineEntry[] }> {
  try {
    const segments = buildSegments(data.text, data.voice);
    const url = `${API_BASE}/tts/?with_timeline=true`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segments),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    let timeline: TimelineEntry[] = [];

    const raw = response.headers.get('X-Timeline');
    if (raw) {
      try {
        const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        timeline = JSON.parse(decoded);
      } catch { /* ignore malformed timeline */ }
    }

    return { blob, timeline };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
