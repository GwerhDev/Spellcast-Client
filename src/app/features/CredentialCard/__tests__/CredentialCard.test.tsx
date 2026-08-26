import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { CredentialCard } from '../index';
import type { TTS_Credential, Voice } from '../../../../interfaces';

const createCredentialMock = vi.fn();
const updateCredentialMock = vi.fn();
const deleteCredentialMock = vi.fn();
const setCurrentCredentialMock = vi.fn().mockResolvedValue(undefined);
vi.mock('services/credentials', () => ({
  createCredential: (...args: unknown[]) => createCredentialMock(...args),
  updateCredential: (...args: unknown[]) => updateCredentialMock(...args),
  deleteCredential: (...args: unknown[]) => deleteCredentialMock(...args),
  // Not called directly by CredentialCard, but credentialsSlice's updateCurrentCredential
  // thunk (dispatched by handleToggleActive/handleDelete) calls it internally.
  setCurrentCredential: (...args: unknown[]) => setCurrentCredentialMock(...args),
}));

const getVoicesByCredentialMock = vi.fn();
vi.mock('services/tts', () => ({
  getVoicesByCredential: (...args: unknown[]) => getVoicesByCredentialMock(...args),
}));

const baseCredential: TTS_Credential = {
  id: 'cred-1',
  region: 'eastus',
  azure_key: 'abc123',
  voices: [],
};

const voices: Voice[] = [
  { value: 'v1', name: 'Voice One', gender: 'Female' },
  { value: 'v2', name: 'Voice Two', gender: 'Male' },
];

const fetchCredentials = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CredentialCard', () => {
  it('renders an existing credential in read-only mode', () => {
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    expect(screen.getByDisplayValue('abc123')).toBeDisabled();
    expect(screen.getByDisplayValue('eastus')).toBeDisabled();
    expect(screen.getByTestId('credential-card-edit')).toBeInTheDocument();
    expect(screen.queryByTestId('credential-card-save')).not.toBeInTheDocument();
    expect(screen.getByTestId('credential-card-toggle-active')).toBeInTheDocument();
    expect(screen.getByTestId('credential-card-delete')).toBeInTheDocument();
    expect(screen.queryByTestId('credential-card-cancel')).not.toBeInTheDocument();
  });

  it('renders a new credential already in edit mode, without a toggle-active or delete button', () => {
    const newCredential: TTS_Credential = { region: '', azure_key: '', isNew: true };
    renderWithProviders(
      <ul><CredentialCard credential={newCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    expect(screen.getByPlaceholderText('Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Region')).toBeInTheDocument();
    expect(screen.getByTestId('credential-card-save')).toBeInTheDocument();
    expect(screen.getByTestId('credential-card-cancel')).toBeInTheDocument();
    expect(screen.queryByTestId('credential-card-toggle-active')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credential-card-delete')).not.toBeInTheDocument();
  });

  it('marks the card active when it matches the current credential in the store', () => {
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential], currentCredentialId: 'cred-1', loading: false } } }
    );

    expect(screen.getByTestId('credential-card-toggle-active')).toHaveAttribute('title', 'Active credential');
  });

  it('enters edit mode and lets the key/region inputs be changed', () => {
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-edit'));
    const keyInput = screen.getByDisplayValue('abc123');
    expect(keyInput).not.toBeDisabled();

    fireEvent.change(keyInput, { target: { value: 'new-key' } });
    expect(screen.getByDisplayValue('new-key')).toBeInTheDocument();
  });

  it('saves an existing credential via updateCredential and updates the store', async () => {
    const updated: TTS_Credential = { ...baseCredential, azure_key: 'new-key' };
    updateCredentialMock.mockResolvedValue(updated);
    const { store } = renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential], currentCredentialId: null, loading: false } } }
    );

    fireEvent.click(screen.getByTestId('credential-card-edit'));
    fireEvent.change(screen.getByDisplayValue('abc123'), { target: { value: 'new-key' } });
    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-save')); });

    expect(updateCredentialMock).toHaveBeenCalledWith('cred-1', { azure_key: 'new-key', region: 'eastus', voices: [] });
    expect(createCredentialMock).not.toHaveBeenCalled();
    await waitFor(() => expect(store.getState().credentials.credentials[0].azure_key).toBe('new-key'));
    expect(screen.getByTestId('credential-card-edit')).toBeInTheDocument(); // back to read-only
  });

  it('saves a new credential via createCredential and calls onSaveNew', async () => {
    createCredentialMock.mockResolvedValue({ id: 'new-id', region: 'westus', azure_key: 'k' });
    const onSaveNew = vi.fn();
    const newCredential: TTS_Credential = { region: '', azure_key: '', isNew: true };
    renderWithProviders(
      <ul><CredentialCard credential={newCredential} fetchCredentials={fetchCredentials} onSaveNew={onSaveNew} /></ul>
    );

    fireEvent.change(screen.getByPlaceholderText('Key'), { target: { value: 'k' } });
    fireEvent.change(screen.getByPlaceholderText('Region'), { target: { value: 'westus' } });
    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-save')); });

    expect(createCredentialMock).toHaveBeenCalledWith({ azure_key: 'k', region: 'westus' });
    expect(updateCredentialMock).not.toHaveBeenCalled();
    expect(onSaveNew).toHaveBeenCalled();
  });

  it('cancel on an existing credential discards local edits without calling any service', () => {
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-edit'));
    fireEvent.change(screen.getByDisplayValue('abc123'), { target: { value: 'discard-me' } });
    fireEvent.click(screen.getByTestId('credential-card-cancel'));

    expect(screen.getByDisplayValue('abc123')).toBeDisabled();
    expect(updateCredentialMock).not.toHaveBeenCalled();
  });

  it('cancel on a new credential calls onCancelNew instead of resetting local state', () => {
    const onCancelNew = vi.fn();
    const newCredential: TTS_Credential = { region: '', azure_key: '', isNew: true };
    renderWithProviders(
      <ul><CredentialCard credential={newCredential} fetchCredentials={fetchCredentials} onCancelNew={onCancelNew} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-cancel'));
    expect(onCancelNew).toHaveBeenCalled();
  });

  it('deletes an existing credential, clears it as current if it was active, and refetches', async () => {
    deleteCredentialMock.mockResolvedValue(undefined);
    const { store } = renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential], currentCredentialId: 'cred-1', loading: false } } }
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-delete')); });

    expect(deleteCredentialMock).toHaveBeenCalledWith('cred-1');
    await waitFor(() => expect(store.getState().credentials.currentCredentialId).toBeNull());
    expect(fetchCredentials).toHaveBeenCalled();
  });

  it('deleting a non-active credential leaves currentCredentialId untouched', async () => {
    const other: TTS_Credential = { ...baseCredential, id: 'cred-2' };
    const { store } = renderWithProviders(
      <ul><CredentialCard credential={other} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential, other], currentCredentialId: 'cred-1', loading: false } } }
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-delete')); });

    expect(deleteCredentialMock).toHaveBeenCalledWith('cred-2');
    expect(store.getState().credentials.currentCredentialId).toBe('cred-1');
    expect(fetchCredentials).toHaveBeenCalled();
  });

  it('delete on a new credential calls onCancelNew instead of hitting the service', () => {
    const onCancelNew = vi.fn();
    const newCredential: TTS_Credential = { region: '', azure_key: '', isNew: true };
    renderWithProviders(
      <ul><CredentialCard credential={newCredential} fetchCredentials={fetchCredentials} onCancelNew={onCancelNew} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-cancel'));
    expect(onCancelNew).toHaveBeenCalled();
    expect(deleteCredentialMock).not.toHaveBeenCalled();
  });

  it('toggles this credential active/inactive via updateCurrentCredential', async () => {
    const { store } = renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential], currentCredentialId: null, loading: false } } }
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-toggle-active')); });
    await waitFor(() => expect(store.getState().credentials.currentCredentialId).toBe('cred-1'));
  });

  it('does nothing when toggling active on a credential without an id', () => {
    const idLess: TTS_Credential = { region: 'x', azure_key: 'y' };
    const { store } = renderWithProviders(
      <ul><CredentialCard credential={idLess} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [], currentCredentialId: null, loading: false } } }
    );

    // The button still renders (only handleToggleActive itself guards on credential.id) --
    // clicking it must be a no-op, never dispatching updateCurrentCredential.
    fireEvent.click(screen.getByTestId('credential-card-toggle-active'));
    expect(setCurrentCredentialMock).not.toHaveBeenCalled();
    expect(store.getState().credentials.currentCredentialId).toBeNull();
  });

  it('opens the voice selector, fetches voices, and shows them once loaded', async () => {
    getVoicesByCredentialMock.mockResolvedValue(voices);
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-voices')); });

    expect(getVoicesByCredentialMock).toHaveBeenCalledWith('cred-1');
    await waitFor(() => expect(screen.getByText('Voice One')).toBeInTheDocument());
    expect(screen.getByText('Voice Two')).toBeInTheDocument();
  });

  it('swallows a failed voice fetch instead of crashing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    getVoicesByCredentialMock.mockRejectedValue(new Error('network down'));
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-voices')); });

    await waitFor(() => expect(getVoicesByCredentialMock).toHaveBeenCalled());
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('does not open the voice selector for a credential without an id', () => {
    const idLess: TTS_Credential = { region: 'x', azure_key: 'y', isNew: true };
    renderWithProviders(
      <ul><CredentialCard credential={idLess} fetchCredentials={fetchCredentials} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-voices'));
    expect(getVoicesByCredentialMock).not.toHaveBeenCalled();
  });

  it('checking a voice in the selector toggles it into selectedVoices, reflected on the next save', async () => {
    getVoicesByCredentialMock.mockResolvedValue(voices);
    updateCredentialMock.mockResolvedValue({ ...baseCredential, voices: [voices[0]] });
    renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>,
      { preloadedState: { credentials: { credentials: [baseCredential], currentCredentialId: null, loading: false } } }
    );

    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-voices')); });
    await waitFor(() => expect(screen.getByText('Voice One')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Voice One'));
    fireEvent.click(screen.getByTestId('credential-card-edit'));
    await act(async () => { fireEvent.click(screen.getByTestId('credential-card-save')); });

    expect(updateCredentialMock).toHaveBeenCalledWith('cred-1', { azure_key: 'abc123', region: 'eastus', voices: [voices[0]] });
  });

  it('resets local key/region/voices/edition state whenever the credential prop changes', () => {
    const { rerender } = renderWithProviders(
      <ul><CredentialCard credential={baseCredential} fetchCredentials={fetchCredentials} /></ul>
    );

    fireEvent.click(screen.getByTestId('credential-card-edit'));
    fireEvent.change(screen.getByDisplayValue('abc123'), { target: { value: 'unsaved-change' } });

    const updated: TTS_Credential = { ...baseCredential, azure_key: 'server-value' };
    // rerender reuses the same wrapper (and therefore the same store/provider) bound
    // at the initial renderWithProviders call -- no need to pass it again.
    rerender(<ul><CredentialCard credential={updated} fetchCredentials={fetchCredentials} /></ul>);

    expect(screen.getByDisplayValue('server-value')).toBeDisabled();
  });
});
