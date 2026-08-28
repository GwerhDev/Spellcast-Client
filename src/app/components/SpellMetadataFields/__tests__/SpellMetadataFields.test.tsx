import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../../../i18n';
import { SpellMetadataFields } from '../index';

const renderField = (overrides: Partial<React.ComponentProps<typeof SpellMetadataFields>> = {}) =>
  render(
    <LanguageProvider>
      <SpellMetadataFields
        expanded={false}
        onToggleExpanded={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        author=""
        onAuthorChange={vi.fn()}
        tagsInput=""
        onTagsInputChange={vi.fn()}
        language=""
        onLanguageChange={vi.fn()}
        {...overrides}
      />
    </LanguageProvider>
  );

describe('SpellMetadataFields', () => {
  it('renders only the toggle when collapsed', () => {
    renderField({ expanded: false });
    expect(screen.getByTestId('spell-metadata-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('spell-metadata-section')).not.toBeInTheDocument();
  });

  it('renders all four fields when expanded, with their current values', () => {
    renderField({
      expanded: true,
      description: 'A tale',
      author: 'Jane Doe',
      tagsInput: 'fantasy, adventure',
      language: 'en',
    });
    expect(screen.getByTestId('spell-metadata-description')).toHaveValue('A tale');
    expect(screen.getByTestId('spell-metadata-author')).toHaveValue('Jane Doe');
    expect(screen.getByTestId('spell-metadata-tags')).toHaveValue('fantasy, adventure');
    expect(screen.getByTestId('spell-metadata-language')).toHaveValue('en');
  });

  it('calls the toggle callback when clicked', () => {
    const onToggleExpanded = vi.fn();
    renderField({ onToggleExpanded });
    fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it('calls each field\'s onChange with the typed value', () => {
    const onDescriptionChange = vi.fn();
    const onAuthorChange = vi.fn();
    const onTagsInputChange = vi.fn();
    const onLanguageChange = vi.fn();
    renderField({ expanded: true, onDescriptionChange, onAuthorChange, onTagsInputChange, onLanguageChange });

    fireEvent.change(screen.getByTestId('spell-metadata-description'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('spell-metadata-author'), { target: { value: 'y' } });
    fireEvent.change(screen.getByTestId('spell-metadata-tags'), { target: { value: 'z' } });
    fireEvent.change(screen.getByTestId('spell-metadata-language'), { target: { value: 'w' } });

    expect(onDescriptionChange).toHaveBeenCalledWith('x');
    expect(onAuthorChange).toHaveBeenCalledWith('y');
    expect(onTagsInputChange).toHaveBeenCalledWith('z');
    expect(onLanguageChange).toHaveBeenCalledWith('w');
  });

  describe('refresh-from-PDF action (TCORE-103, optional -- SpellCreateForm never passes it)', () => {
    it('is not rendered when onRefreshFromPdf is not provided', () => {
      renderField({ expanded: true });
      expect(screen.queryByTestId('spell-metadata-refresh-btn')).not.toBeInTheDocument();
    });

    it('is rendered and clickable when provided', () => {
      const onRefreshFromPdf = vi.fn();
      renderField({ expanded: true, onRefreshFromPdf });
      const btn = screen.getByTestId('spell-metadata-refresh-btn');
      fireEvent.click(btn);
      expect(onRefreshFromPdf).toHaveBeenCalledTimes(1);
    });

    it('is disabled when refreshDisabled is true (e.g. no original PDF stored)', () => {
      renderField({ expanded: true, onRefreshFromPdf: vi.fn(), refreshDisabled: true });
      expect(screen.getByTestId('spell-metadata-refresh-btn')).toBeDisabled();
    });

    it('is disabled while isRefreshing is true', () => {
      renderField({ expanded: true, onRefreshFromPdf: vi.fn(), isRefreshing: true });
      expect(screen.getByTestId('spell-metadata-refresh-btn')).toBeDisabled();
    });
  });
});
