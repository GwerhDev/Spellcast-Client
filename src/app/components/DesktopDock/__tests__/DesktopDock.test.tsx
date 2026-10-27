import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopDock } from '../DesktopDock';
import { LanguageProvider } from '../../../../i18n';
import { EXTERNAL_LINKS } from '../../../../config/externalLinks';

const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: { href: 'http://spellcast.example.com/' } });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: originalLocation });
});

const renderDock = () => render(<LanguageProvider><DesktopDock /></LanguageProvider>);

describe('DesktopDock', () => {
  it("goes to Nhexa's home", () => {
    renderDock();
    fireEvent.click(screen.getByTestId('dock-home'));
    expect(window.location.href).toBe(EXTERNAL_LINKS.nhexaInterface);
  });

  it('goes to the account', () => {
    renderDock();
    fireEvent.click(screen.getByTestId('dock-account'));
    expect(window.location.href).toBe(EXTERNAL_LINKS.accountsCenter);
  });

  it("shows the settings, but they can't be opened yet", () => {
    renderDock();
    expect(screen.getByTestId('dock-settings')).toBeDisabled();
  });
});
