import { describe, it, expect, vi, onTestFinished } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AltarPanel } from '../AltarPanel';

const panel = (props: Partial<React.ComponentProps<typeof AltarPanel>> = {}) => (
  <AltarPanel coverUrl={null} highlighted={false} menuOpen={false} center={<span data-testid="center" />} footer={<span data-testid="footer" />} {...props} />
);

describe('AltarPanel', () => {
  it('renders its center and footer, transparent without a cover', () => {
    render(panel());
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
    expect(screen.queryByTestId('altar-cover')).not.toBeInTheDocument();
  });

  it('fills with the cover when there is one', () => {
    render(panel({ coverUrl: 'blob:cover' }));
    expect(screen.getByTestId('altar-cover').style.backgroundImage).toContain('blob:cover');
    expect(screen.getByTestId('altar').className).toMatch(/hasCover/);
  });

  it('lights up while highlighted', () => {
    render(panel({ highlighted: true }));
    expect(screen.getByTestId('altar').className).toMatch(/dragActive/);
  });

  it('only renders the corner slots that have content', () => {
    const { rerender } = render(panel());
    expect(screen.queryByTestId('altar-corner-left')).not.toBeInTheDocument();
    expect(screen.queryByTestId('altar-corner-right')).not.toBeInTheDocument();
    rerender(panel({ leftCorner: <span data-testid="l" />, rightCorner: <span data-testid="r" /> }));
    expect(screen.getByTestId('altar-corner-left')).toContainElement(screen.getByTestId('l'));
    expect(screen.getByTestId('altar-corner-right')).toContainElement(screen.getByTestId('r'));
  });

  it('is the drop target: drag handlers are on the whole panel', () => {
    const onDrop = vi.fn();
    const onDragEnter = vi.fn();
    render(panel({ onDrop, onDragEnter }));
    fireEvent.dragEnter(screen.getByTestId('altar'));
    fireEvent.drop(screen.getByTestId('altar'));
    expect(onDragEnter).toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalled();
  });

  it('immersive: no box or cover of its own (the page shows it), still lit up for drops', () => {
    render(panel({ coverUrl: 'blob:cover', immersive: true, highlighted: true }));
    expect(screen.queryByTestId('altar-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('altar').className).toMatch(/immersive/);
    expect(screen.getByTestId('altar').className).toMatch(/dragActive/);
  });

  // The light-on-cover colors are for over a cover: with none behind, on a light theme
  // they'd be light text on a light page.
  it('immersive without a cover keeps the page\'s own colors', () => {
    render(panel({ coverUrl: null, immersive: true }));
    expect(screen.getByTestId('altar').className).toMatch(/immersive/);
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
    expect(screen.getByTestId('altar').className).not.toMatch(/hasCover/);
  });

  // Immersive, the sentence being read is shown whole: it runs down past the footer's slot,
  // and the panel says how far, so the page can make room for it below.
  describe('footer overflow', () => {
    // The slot is 100px tall; its content as tall as what it shows says.
    const heights = () => {
      const client = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return this.dataset.testid === 'altar-footer' ? 100 : 0;
      });
      const offset = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
        const shown = Array.from(this.children).find(child => child.hasAttribute('data-height'));
        return shown ? Number(shown.getAttribute('data-height')) : 0;
      });
      onTestFinished(() => { client.mockRestore(); offset.mockRestore(); });
    };
    const footer = (height: number) => <span data-testid={`footer-${height}`} data-height={height} />;

    it('reports how far a long footer runs past its slot', () => {
      heights();
      const onFooterOverflow = vi.fn();
      render(panel({ immersive: true, footer: footer(160), onFooterOverflow }));
      expect(onFooterOverflow).toHaveBeenLastCalledWith(60);
    });

    it('reports nothing over when the footer fits', () => {
      heights();
      const onFooterOverflow = vi.fn();
      render(panel({ immersive: true, footer: footer(80), onFooterOverflow }));
      expect(onFooterOverflow).toHaveBeenLastCalledWith(0);
    });

    it('measures again once the footer shows something else', async () => {
      heights();
      const onFooterOverflow = vi.fn();
      const { rerender } = render(panel({ immersive: true, footer: footer(160), footerKey: 'sentence', onFooterOverflow }));
      expect(onFooterOverflow).toHaveBeenLastCalledWith(60);
      rerender(panel({ immersive: true, footer: footer(80), footerKey: 'now', onFooterOverflow }));
      await waitFor(() => expect(onFooterOverflow).toHaveBeenLastCalledWith(0));
    });

    it('takes its overflow back when it goes away', () => {
      heights();
      const onFooterOverflow = vi.fn();
      const { unmount } = render(panel({ immersive: true, footer: footer(160), onFooterOverflow }));
      unmount();
      expect(onFooterOverflow).toHaveBeenLastCalledWith(0);
    });
  });
});
