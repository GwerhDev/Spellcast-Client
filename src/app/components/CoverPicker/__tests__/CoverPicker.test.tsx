import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../../../i18n';
import { CoverPicker } from '../index';

const renderPicker = (overrides: Partial<React.ComponentProps<typeof CoverPicker>> = {}) =>
  render(
    <LanguageProvider>
      <CoverPicker
        coverUrl={null}
        onUploadImage={vi.fn()}
        {...overrides}
      />
    </LanguageProvider>
  );

describe('CoverPicker', () => {
  it('renders a fallback icon when there is no cover yet', () => {
    const { container } = renderPicker({ coverUrl: null });
    expect(screen.getByTestId('cover-picker')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders the cover image when coverUrl is set', () => {
    const { container } = renderPicker({ coverUrl: 'data:image/png;base64,AAAA' });
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });

  it('always renders the upload action', () => {
    renderPicker();
    expect(screen.getByTestId('cover-picker-upload-btn')).toBeInTheDocument();
  });

  it('calls onUploadImage with the selected file', () => {
    const onUploadImage = vi.fn();
    const { container } = renderPicker({ onUploadImage });
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUploadImage).toHaveBeenCalledWith(file);
  });

  describe('"use PDF page 1" action (optional -- omitted when there is no PDF to render from)', () => {
    it('is not rendered when onUseFirstPage is not provided', () => {
      renderPicker();
      expect(screen.queryByTestId('cover-picker-use-first-page-btn')).not.toBeInTheDocument();
    });

    it('is rendered and clickable when provided', () => {
      const onUseFirstPage = vi.fn();
      renderPicker({ onUseFirstPage });
      fireEvent.click(screen.getByTestId('cover-picker-use-first-page-btn'));
      expect(onUseFirstPage).toHaveBeenCalledTimes(1);
    });
  });
});
