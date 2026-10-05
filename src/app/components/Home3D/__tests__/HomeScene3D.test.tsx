import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { faBuildingColumns, faScroll } from '@fortawesome/free-solid-svg-icons';

// The canvas' own props, as the scene asks for them (no WebGL here).
const canvasProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('@react-three/fiber', async (original) => ({
  ...(await original() as object),
  Canvas: (props: Record<string, unknown>) => { canvasProps.current = props; return null; },
}));

import { HomeScene3D } from '../HomeScene3D';

describe('HomeScene3D', () => {
  // Drawing every frame kept the GPU busy on a still home page.
  it('draws only when asked, not every frame', () => {
    render(
      <HomeScene3D
        places={[]}
        anchor={{ current: null }}
        onBring={vi.fn()}
        onOpen={vi.fn()}
        onMore={vi.fn()}
        onDragChange={vi.fn()}
        hiddenId={null}
        moreLabel="Grimoire"
        moreIcon={faBuildingColumns}
        emptyIcon={faScroll}
      />,
    );
    expect(canvasProps.current?.frameloop).toBe('demand');
  });
});
