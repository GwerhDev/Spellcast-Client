// Builds a silent 8kHz 8-bit mono WAV of the given length. Chromium treats a
// media element shorter than 5s as a one-shot sound, not as a player: a page
// whose only "playing" audio is that short gets no controllable media session,
// so the headset/OS media keys never reach it. A long silent clip counts as a
// real player.
export const makeSilentWav = (seconds: number): Blob => {
  const sampleRate = 8000;
  const samples = sampleRate * seconds;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128); // 8-bit unsigned PCM silence
  return new Blob([buf], { type: 'audio/wav' });
};
