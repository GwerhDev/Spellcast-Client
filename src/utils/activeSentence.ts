import type { TimelineEntry } from '../services/tts';

// The sentence being read right now, as an index into the page's sentences. The browser
// voice tracks it directly (currentSentenceIndex); a provider voice (voice type 'ai') plays
// a recorded page, so it's the timeline entry the audio's current time (seconds) falls in --
// the last one once the audio is past every entry.
export const activeSentenceIndex = (
  voiceType: string,
  currentSentenceIndex: number,
  providerTimeline: TimelineEntry[],
  providerCurrentTime: number,
): number => {
  if (voiceType !== 'ai' || providerTimeline.length === 0) return currentSentenceIndex;
  const ms = providerCurrentTime * 1000;
  for (let i = 0; i < providerTimeline.length; i++) {
    if (ms < providerTimeline[i].end) return i;
  }
  return providerTimeline.length - 1;
};
