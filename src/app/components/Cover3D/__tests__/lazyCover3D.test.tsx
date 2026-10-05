import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { LazyCoverFrame3DCanvas, preloadCover3D } from '../lazyCover3D';
import type { CoverFrame3DConfig } from '../../../../utils/coverFrame';

// WebGL isn't available here: each 3D cover component stands in as a marker.
vi.mock('../CoverFrame3DCanvas', () => ({ CoverFrame3DCanvas: () => <div data-testid="cover-3d-canvas" /> }));
vi.mock('../CoverFrame3DView', () => ({ CoverFrame3DView: () => <div data-testid="cover-3d-view" /> }));

const config: CoverFrame3DConfig = { corner3dUrl: '/frames/corner.svg' };

describe('lazyCover3D', () => {
  // A preloaded cover never suspends: React would hold it back a while before showing it.
  it('once preloaded, renders the cover right away, without suspending', async () => {
    await preloadCover3D();
    render(
      <Suspense fallback={<div data-testid="suspended" />}>
        <LazyCoverFrame3DCanvas config={config} coverUrl="blob:cover" radius={0} />
      </Suspense>,
    );
    expect(screen.queryByTestId('suspended')).not.toBeInTheDocument();
    expect(screen.getByTestId('cover-3d-canvas')).toBeInTheDocument();
  });
});
