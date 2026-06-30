import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { NotificationsButton } from '../index';
import { enqueueUpload, setUploadDone, setQueueUiState } from '../../../../store/pdfUploadSlice';

describe('NotificationsButton', () => {
  it('renders the button', () => {
    renderWithProviders(<NotificationsButton />);
    expect(screen.getByTestId('notifications-button')).toBeInTheDocument();
  });

  it('opens popover on click', () => {
    renderWithProviders(<NotificationsButton />);
    fireEvent.click(screen.getByTestId('notifications-toggle-btn'));
    expect(screen.getByTestId('notifications-title')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    renderWithProviders(<NotificationsButton />);
    fireEvent.click(screen.getByTestId('notifications-toggle-btn'));
    expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
  });

  it('shows badge when there are unread notifications', () => {
    const store = makeStore();
    store.dispatch(enqueueUpload({ id: 'j1', title: 'Doc.pdf' } as never));
    store.dispatch(setQueueUiState('closed'));
    store.dispatch(setUploadDone({ id: 'j1', resultDocId: 'doc-1' }));
    renderWithProviders(<NotificationsButton />, { store });
    expect(screen.getByTestId('notifications-badge')).toBeInTheDocument();
  });
});
