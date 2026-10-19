import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { NewVersionModal } from '../NewVersionModal';

const labels = { title: 'New version', name: 'Name', placeholder: '', create: 'Create', cancel: 'Cancel', taken: 'Taken' };

describe('NewVersionModal', () => {
  it('creates a version with the trimmed name', () => {
    const onCreate = vi.fn();
    renderWithProviders(<NewVersionModal show taken={['source']} onClose={vi.fn()} onCreate={onCreate} labels={labels} />);
    expect(screen.getByTestId('new-version-create')).toBeDisabled();
    fireEvent.change(document.getElementById('new-version-name')!, { target: { value: '  draft  ' } });
    fireEvent.submit(screen.getByTestId('new-version-modal'));
    expect(onCreate).toHaveBeenCalledWith('draft');
  });

  it('never creates one with a name already taken', () => {
    const onCreate = vi.fn();
    renderWithProviders(<NewVersionModal show taken={['source']} onClose={vi.fn()} onCreate={onCreate} labels={labels} />);
    fireEvent.change(document.getElementById('new-version-name')!, { target: { value: 'source' } });
    expect(screen.getByTestId('new-version-taken')).toBeInTheDocument();
    fireEvent.submit(screen.getByTestId('new-version-modal'));
    expect(onCreate).not.toHaveBeenCalled();
  });
});
