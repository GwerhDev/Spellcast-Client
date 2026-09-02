import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutLicense } from '../AboutLicense';
import { LanguageProvider } from '../../../../i18n';
import { EXTERNAL_LINKS } from '../../../../config/externalLinks';

const renderAbout = () =>
  render(
    <LanguageProvider>
      <AboutLicense />
    </LanguageProvider>
  );

// TCORE-82: this is the AGPLv3 network-use notice itself -- must always render both the
// license explanation and a real, reachable link to the source code.
describe('AboutLicense', () => {
  it('renders the license notice', () => {
    renderAbout();
    expect(screen.getByTestId('about-license')).toBeInTheDocument();
  });

  it('links to the full AGPL-3.0 license text', () => {
    renderAbout();
    expect(screen.getByTestId('about-license-link')).toHaveAttribute('href', EXTERNAL_LINKS.licenseText);
  });

  it('links to the public source code repository', () => {
    renderAbout();
    expect(screen.getByTestId('about-source-link')).toHaveAttribute('href', EXTERNAL_LINKS.sourceCode);
  });

  it('opens both external links in a new tab without leaking a window.opener reference', () => {
    renderAbout();
    [screen.getByTestId('about-license-link'), screen.getByTestId('about-source-link')].forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    });
  });

  it('renders a copyright notice', () => {
    renderAbout();
    expect(screen.getByTestId('about-copyright')).toHaveTextContent('TerminalCore Labs');
  });
});
