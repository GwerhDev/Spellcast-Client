import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverFramePickerModal } from '../CoverFramePickerModal';
import { LanguageProvider } from '../../../../i18n';
import type { CoverFrame } from '../../../../config/assets';

const borders: CoverFrame[] = [
  { id: 'gilded', name: 'Gilded', description: '', category: 'cover-frame', unlockMethod: 'free', cssValue: '3px solid #c9a24a', thumbnail: '#c9a24a', tags: [] },
  { id: 'other', name: 'Other', description: '', category: 'cover-frame', unlockMethod: 'free', cssValue: '2px dashed #fff', thumbnail: '#fff', tags: [] },
];

const renderModal = (props: Partial<React.ComponentProps<typeof CoverFramePickerModal>> = {}) =>
  render(
    <LanguageProvider>
      <CoverFramePickerModal show onClose={vi.fn()} borders={borders} selectedId={undefined} onPick={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('CoverFramePickerModal', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(
      <LanguageProvider>
        <CoverFramePickerModal show={false} onClose={vi.fn()} borders={borders} selectedId={undefined} onPick={vi.fn()} />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an option for Default, No border, and each owned border', () => {
    renderModal();
    expect(screen.getByTestId('cover-frame-option-default')).toBeInTheDocument();
    expect(screen.getByTestId('cover-frame-option-none')).toBeInTheDocument();
    expect(screen.getByTestId('cover-frame-option-gilded')).toBeInTheDocument();
    expect(screen.getByTestId('cover-frame-option-other')).toBeInTheDocument();
  });

  // TCORE-123: mirrors Spell.coverFrameId's three states exactly. CSS module class names
  // are hashed at build time, so match on a substring rather than the literal class.
  const isMarkedSelected = (el: HTMLElement) => /optionSelected/.test(el.className);

  describe('marking the selected option', () => {
    it('marks Default as selected when selectedId is undefined', () => {
      renderModal({ selectedId: undefined });
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-default'))).toBe(true);
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-none'))).toBe(false);
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-gilded'))).toBe(false);
    });

    it('marks No border as selected when selectedId is null', () => {
      renderModal({ selectedId: null });
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-none'))).toBe(true);
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-default'))).toBe(false);
    });

    it('marks the matching border as selected when selectedId is a border id', () => {
      renderModal({ selectedId: 'gilded' });
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-gilded'))).toBe(true);
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-default'))).toBe(false);
      expect(isMarkedSelected(screen.getByTestId('cover-frame-option-other'))).toBe(false);
    });
  });

  describe('picking an option', () => {
    it('calls onPick(undefined) when picking Default', () => {
      const onPick = vi.fn();
      renderModal({ selectedId: 'gilded', onPick });
      fireEvent.click(screen.getByTestId('cover-frame-option-default'));
      expect(onPick).toHaveBeenCalledWith(undefined);
    });

    it('calls onPick(null) when picking No border', () => {
      const onPick = vi.fn();
      renderModal({ selectedId: 'gilded', onPick });
      fireEvent.click(screen.getByTestId('cover-frame-option-none'));
      expect(onPick).toHaveBeenCalledWith(null);
    });

    it('calls onPick(id) when picking a specific border', () => {
      const onPick = vi.fn();
      renderModal({ onPick });
      fireEvent.click(screen.getByTestId('cover-frame-option-other'));
      expect(onPick).toHaveBeenCalledWith('other');
    });
  });
});
