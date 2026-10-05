import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CoverFrame3DView } from '../CoverFrame3DView';
import { getPageBooks } from '../pageBooks';

const config = { corner3dUrl: '/frames/corner.svg' };

// A card's cover is drawn by the page's 3D scene, over the element the card renders for it.
describe('CoverFrame3DView', () => {
  it('puts its cover in the page scene while it shows, over its own element, and takes it out after', () => {
    const { container, rerender, unmount } = render(<CoverFrame3DView config={config} coverUrl="blob:a" radius={3} className="slot" />);
    const element = container.querySelector('.slot');
    expect([...getPageBooks().values()]).toEqual([{ element, config, coverUrl: 'blob:a', radius: 3 }]);

    rerender(<CoverFrame3DView config={config} coverUrl="blob:b" radius={3} className="slot" />);
    expect([...getPageBooks().values()].map(book => book.coverUrl)).toEqual(['blob:b']);

    unmount();
    expect(getPageBooks().size).toBe(0);
  });
});
