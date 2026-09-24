import { describe, it, expect } from 'vitest';
import { makeSilentWav } from '../silentAudio';

const read = async (blob: Blob) => new DataView(await new Response(blob).arrayBuffer());
const ascii = (v: DataView, o: number, n: number) =>
  String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));

describe('makeSilentWav', () => {
  it('builds a valid mono 8-bit 8kHz WAV of the requested length', async () => {
    const blob = makeSilentWav(30);
    const v = await read(blob);
    expect(blob.type).toBe('audio/wav');
    expect(ascii(v, 0, 4)).toBe('RIFF');
    expect(ascii(v, 8, 4)).toBe('WAVE');
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(8000);
    expect(v.getUint16(34, true)).toBe(8);
    expect(v.getUint32(40, true)).toBe(8000 * 30);
    expect(v.byteLength).toBe(44 + 8000 * 30);
  });

  it('fills the samples with silence (unsigned 8-bit midpoint)', async () => {
    const v = await read(makeSilentWav(1));
    for (const o of [44, 44 + 4000, v.byteLength - 1]) expect(v.getUint8(o)).toBe(128);
  });
});
