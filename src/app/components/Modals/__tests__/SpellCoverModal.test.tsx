import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpellCoverModal } from '../SpellCoverModal';
import { LanguageProvider } from '../../../../i18n';

const renderModal = (props: Partial<React.ComponentProps<typeof SpellCoverModal>> = {}) =>
  render(
    <LanguageProvider>
      <SpellCoverModal
        show
        onClose={vi.fn()}
        coverUrl={null}
        onUploadImage={vi.fn()}
        frames={[]}
        frameId={undefined}
        onPickFrame={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  );

describe('SpellCoverModal', () => {
  it('renders nothing when hidden', () => {
    renderModal({ show: false });
    expect(screen.queryByTestId('spell-cover-modal')).not.toBeInTheDocument();
  });

  it('shows both the cover picker and the frame choices', () => {
    renderModal();
    expect(screen.getByTestId('cover-picker')).toBeInTheDocument();
    expect(screen.getByTestId('cover-frame-options')).toBeInTheDocument();
  });

  it('passes a frame pick through', () => {
    const onPickFrame = vi.fn();
    renderModal({ onPickFrame });
    fireEvent.click(screen.getByTestId('cover-frame-option-none'));
    expect(onPickFrame).toHaveBeenCalledWith(null);
  });

  it('only offers the PDF cover when there is one to take it from', () => {
    const { unmount } = renderModal();
    expect(screen.queryByTestId('cover-picker-use-first-page-btn')).not.toBeInTheDocument();
    unmount();
    renderModal({ onUseFirstPage: vi.fn() });
    expect(screen.getByTestId('cover-picker-use-first-page-btn')).toBeInTheDocument();
  });

  it('covers the options with a loader while busy', () => {
    const { rerender } = renderModal();
    expect(screen.queryByTestId('spell-cover-modal-busy')).not.toBeInTheDocument();
    rerender(
      <LanguageProvider>
        <SpellCoverModal show onClose={vi.fn()} coverUrl={null} onUploadImage={vi.fn()} frames={[]} frameId={undefined} onPickFrame={vi.fn()} busy />
      </LanguageProvider>
    );
    expect(screen.getByTestId('spell-cover-modal-busy')).toBeInTheDocument();
    expect(screen.getByTestId('spell-cover-modal')).toHaveAttribute('aria-busy', 'true');
  });
});
