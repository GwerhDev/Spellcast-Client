import { API_BASE } from '../config/api';
import { Voice } from '../interfaces';
import type { JSONContent } from '@tiptap/core';

export interface TimelineEntry {
  text: string;
  start: number;
  end: number;
}

// Wraps a plain string (no Tiptap editor behind it — e.g. Start/TextOption's free-text box,
// or a JSON.parse fallback when a stored page turns out not to be valid JSON) into the
// minimal doc/paragraph/text tree the backend's Node contract expects.
export const wrapPlainText = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

interface TiptapMarkLike {
  type: string;
  attrs?: Record<string, unknown>;
}

// Stamps `voice` onto every text node that doesn't already carry an explicit voice choice —
// i.e. no `tts` mark at all, or one whose voice is unset/'default'. Mirrors the old
// pre-TCORE-77 injectDefaultVoice(): most content (raw PDF extraction, plain paragraphs) has
// no `tts` marks at all, so without this the backend would never learn which voice the user
// picked in the UI dropdown and would always fall back to the provider's static configured
// default voice — silently ignoring the user's actual selection. A node with an explicit,
// non-default voice (e.g. a character assigned a specific voice in the editor) is left alone.
const injectDefaultVoice = (node: JSONContent, voice: string): JSONContent => {
  if (node.type === 'text') {
    const marks = (node.marks ?? []) as TiptapMarkLike[];
    const ttsIndex = marks.findIndex(m => m.type === 'tts');
    if (ttsIndex === -1) {
      return { ...node, marks: [...marks, { type: 'tts', attrs: { voice } }] };
    }
    const ttsMark = marks[ttsIndex];
    const currentVoice = ttsMark.attrs?.voice;
    if (currentVoice && currentVoice !== 'default') return node;
    const newMarks = [...marks];
    newMarks[ttsIndex] = { ...ttsMark, attrs: { ...ttsMark.attrs, voice } };
    return { ...node, marks: newMarks };
  }
  if (node.content) {
    return { ...node, content: node.content.map(child => injectDefaultVoice(child, voice)) };
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

export class TtsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TtsError';
    this.status = status;
  }
}

// The backend parses the raw Tiptap doc tree itself (provider-aware synthesis) instead of the
// client flattening it into segments — this either forwards an already-built JSONContent tree
// (`doc`) or wraps a plain string into a minimal one (`text`), then stamps the caller's
// selected `voice` onto every node that doesn't already carry its own explicit voice choice.
export async function textToSpeechService(
  data: { doc: JSONContent; voice: string } | { text: string; voice: string },
  signal?: AbortSignal,
): Promise<{ blob: Blob; timeline: TimelineEntry[] }> {
  try {
    const rawDoc = 'doc' in data ? data.doc : wrapPlainText(data.text);
    const doc = injectDefaultVoice(rawDoc, data.voice);
    const url = `${API_BASE}/tts/?with_timeline=true`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TtsError(errorData.detail || `HTTP error! status: ${response.status}`, response.status);
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
