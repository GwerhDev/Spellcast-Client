import { describe, it, expect, vi, onTestFinished } from 'vitest';
import { render } from '@testing-library/react';

// The canvas' own props, as the scene asks for them (no WebGL here).
const canvasProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('@react-three/fiber', async (original) => ({
  ...(await original() as object),
  Canvas: (props: Record<string, unknown>) => { canvasProps.current = props; return null; },
}));

import { CoverFrame3DRoot } from '../CoverFrame3DRoot';
import { setPageBook, removePageBook } from '../pageBooks';
import type { CoverFrame3DConfig } from '../../../../utils/coverFrame';

describe('CoverFrame3DRoot', () => {
  // Drawing every frame while books are on the page kept the GPU busy on a still page.
  it('draws only when asked, not every frame, also with books on the page', () => {
    setPageBook('spell-1', { element: document.createElement('div'), config: {} as CoverFrame3DConfig, coverUrl: 'blob:cover', radius: 0 });
    onTestFinished(() => removePageBook('spell-1'));
    render(<CoverFrame3DRoot />);
    expect(canvasProps.current?.frameloop).toBe('demand');
  });
});
