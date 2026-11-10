import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { act, render, screen } from '@testing-library/react';

// With motion on, as in a browser: a card leaving the row fades out where it was.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => false,
}));

const { Coverflow } = await import('../Coverflow');

const item = (key: string) => ({ key, node: <div data-testid={`card-${key}`}>{key}</div> });
const row = (keys: string[], vanishing: string[] = []) => (
  <Coverflow items={keys.map(item)} renderEmpty={() => null} itemWidth="100px" vanishing={vanishing} />
);

describe('Coverflow: a card leaving the row', () => {
  // The tests' setup skips animations: these are about one.
  beforeAll(() => { MotionGlobalConfig.skipAnimations = false; });
  afterAll(() => { MotionGlobalConfig.skipAnimations = true; });

  it('fades out where it was', async () => {
    const { rerender } = render(row(['a', 'b']));
    rerender(row(['b']));
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(screen.getByTestId('card-a')).toBeInTheDocument();
  });

  it('is gone at once when something else carries it away (vanishing)', async () => {
    const { rerender } = render(row(['a', 'b']));
    rerender(row(['b'], ['a']));
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(screen.queryByTestId('card-a')).toBeNull();
  });
});
