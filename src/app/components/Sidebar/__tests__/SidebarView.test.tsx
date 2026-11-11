import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { faHome, faUser, faBox, faUsers, faHardDrive } from '@fortawesome/free-solid-svg-icons';
import { renderWithProviders as render } from '../../../../test/renderWithProviders';
import { mockMatchMedia } from '../../../../test/mockMatchMedia';
import { SidebarView, settlesOpen } from '../SidebarView';
import type { SidebarDirectLink, SidebarAccordionSection } from '../SidebarView';

const directLinks: SidebarDirectLink[] = [{ key: 'home', icon: faHome, path: '/', label: 'Home' }];

const accordionSections: SidebarAccordionSection[] = [
  {
    key: 'caster',
    icon: faUser,
    path: '/caster/profile',
    label: 'Caster',
    items: [{ path: '/caster/groups', icon: faUsers, label: 'Groups' }],
    subSections: [
      {
        key: 'settings',
        icon: faBox,
        path: '/caster/settings',
        label: 'Settings',
        items: [{ path: '/caster/settings/local', icon: faHardDrive, label: 'Local' }],
      },
    ],
  },
];

const baseProps = {
  directLinks,
  accordionSections,
  activePathname: '/',
  openSections: { editor: false, caster: false, settings: false },
  onToggleCollapsed: vi.fn(),
  onToggleSection: vi.fn(),
};

describe('SidebarView', () => {
  beforeEach(() => {
    // Desktop by default — useMediaQuery('(max-width: 1024px)') resolves to false,
    // so SidebarView renders DesktopSidebar unless a test opts into mockMatchMedia(true).
    mockMatchMedia(false);
  });

  // Rail and panel are both always mounted (stacked, cross-fading via opacity) so the
  // collapse/expand transition can animate — visibility is asserted via aria-hidden /
  // the outer shell's modifier class, not DOM presence.
  it('marks the rail visible and the panel aria-hidden when collapsed', () => {
    render(<SidebarView {...baseProps} collapsed />);
    expect(screen.getByTestId('sidebar-rail')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the panel visible and the rail aria-hidden when expanded', () => {
    render(<SidebarView {...baseProps} collapsed={false} />);
    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByTestId('sidebar-rail')).toHaveAttribute('aria-hidden', 'true');
  });

  it('collapsed rail renders direct links and top-level section icons only, with no sub-items', () => {
    render(<SidebarView {...baseProps} collapsed />);
    expect(screen.getByTestId('sidebar-rail-icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-icon-caster')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-icon-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-section-body-caster')).not.toBeInTheDocument();
  });

  it('calls onToggleCollapsed when the toggle button is clicked', () => {
    const onToggleCollapsed = vi.fn();
    render(<SidebarView {...baseProps} collapsed onToggleCollapsed={onToggleCollapsed} />);
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSection with the section key when a section header chevron is clicked', () => {
    const onToggleSection = vi.fn();
    render(<SidebarView {...baseProps} collapsed={false} onToggleSection={onToggleSection} />);
    fireEvent.click(screen.getByTestId('sidebar-section-header-caster'));
    expect(onToggleSection).toHaveBeenCalledWith('caster');
  });

  it('does not render a section body until its section is open', () => {
    render(<SidebarView {...baseProps} collapsed={false} />);
    expect(screen.queryByTestId('sidebar-section-body-caster')).not.toBeInTheDocument();
  });

  it('supports multiple sections open at the same time', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        openSections={{ editor: false, caster: true, settings: true }}
      />
    );
    expect(screen.getByTestId('sidebar-section-body-caster')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
  });

  it('renders a nested sub-section only once its parent section is open', () => {
    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, caster: false, settings: false }} />);
    expect(screen.queryByTestId('sidebar-nav-item-settings')).not.toBeInTheDocument();

    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, caster: true, settings: false }} />);
    expect(screen.getByTestId('sidebar-nav-item-settings')).toBeInTheDocument();
    // The nested sub-section's own body (its sub-items) stays closed independently.
    expect(screen.queryByTestId('sidebar-section-body-settings')).not.toBeInTheDocument();
  });

  it('opens a nested sub-section independently once both it and its parent are open', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        openSections={{ editor: false, caster: true, settings: true }}
      />
    );
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-sub-item-settings-/caster/settings/local')).toBeInTheDocument();
  });

  it('marks a direct link as active when activePathname matches its path', () => {
    render(<SidebarView {...baseProps} collapsed={false} activePathname="/" />);
    expect(screen.getByTestId('sidebar-nav-item-home').className).toMatch(/activeLink/);
  });

  it('marks a nested sub-item as active when activePathname matches its path', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        activePathname="/caster/settings/local"
        openSections={{ editor: false, caster: true, settings: true }}
      />
    );
    expect(screen.getByTestId('sidebar-sub-item-settings-/caster/settings/local').className).toMatch(/activeLink/);
  });

  it('marks the parent section active when activePathname matches one of its own flat items, not just its own path', () => {
    // "caster"'s own path is /caster/profile -- being on one of its sibling items
    // (/caster/groups) should still highlight "caster" itself, not just the item.
    render(<SidebarView {...baseProps} collapsed={false} activePathname="/caster/groups" />);
    const headerLink = screen.getByTestId('sidebar-nav-item-caster');
    expect(headerLink.parentElement?.className).toMatch(/sectionHeaderActive/);
  });

  it('marks every ancestor section active when activePathname matches a route inside a nested sub-section', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        activePathname="/caster/settings/local"
        openSections={{ editor: false, caster: true, settings: true }}
      />
    );
    expect(screen.getByTestId('sidebar-nav-item-caster').parentElement?.className).toMatch(/sectionHeaderActive/);
    expect(screen.getByTestId('sidebar-nav-item-settings').parentElement?.className).toMatch(/sectionHeaderActive/);
  });
});

describe('SidebarView on mobile', () => {
  // Below the breakpoint there's one grid of the main sections: closed, it's cut down to its
  // first row (the bar), and the rest is out of reach.
  beforeEach(() => {
    mockMatchMedia(true);
  });

  it('closed, is the bar; open, the panel', () => {
    const { unmount } = render(<SidebarView {...baseProps} collapsed />);
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-panel')).not.toBeInTheDocument();
    unmount();
    render(<SidebarView {...baseProps} collapsed={false} />);
    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail')).not.toBeInTheDocument();
  });

  it('the bar has the direct links and the sections with nothing under them first; the rest is out of reach while closed', () => {
    const bareSection: SidebarAccordionSection = { key: 'editor', icon: faBox, path: '/editor', label: 'Editor', items: [] };
    const links: SidebarDirectLink[] = [...directLinks, { key: 'grimoire', icon: faBox, path: '/grimoire', label: 'Grimoire' }];
    render(<SidebarView {...baseProps} collapsed directLinks={links} accordionSections={[...accordionSections, bareSection]} />);
    const keys = [...screen.getByTestId('sidebar-rail').querySelectorAll('a')].map(a => a.dataset.testid?.replace('sidebar-nav-item-', ''));
    expect(keys).toEqual(['home', 'grimoire', 'editor', 'caster']);
    expect(screen.getByTestId('sidebar-nav-item-editor')).not.toHaveAttribute('tabindex');
    expect(screen.getByTestId('sidebar-nav-item-caster')).toHaveAttribute('tabindex', '-1');
  });

  it('open, lists just the main sections, each straight to its page: no submenus', () => {
    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, caster: true, settings: true }} />);
    expect(screen.getByTestId('sidebar-nav-item-home')).toBeInTheDocument();
    for (const section of accordionSections) {
      expect(screen.getByTestId(`sidebar-nav-item-${section.key}`)).toHaveAttribute('href', section.path);
    }
    // Not even an open section's own items or sub-sections.
    expect(screen.queryByTestId('sidebar-nav-item-settings')).not.toBeInTheDocument();
  });

  it('has no menu button: the menu is swiped open and closed', () => {
    render(<SidebarView {...baseProps} collapsed />);
    expect(screen.queryByTestId('sidebar-toggle-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-swipe')).toBeInTheDocument();
  });

  it('let go, settles where it was dragged closer to, unless flicked one way', () => {
    expect(settlesOpen(0.7, 0)).toBe(true);
    expect(settlesOpen(0.3, 0)).toBe(false);
    expect(settlesOpen(0.1, -600)).toBe(true);
    expect(settlesOpen(0.9, 600)).toBe(false);
  });
});
