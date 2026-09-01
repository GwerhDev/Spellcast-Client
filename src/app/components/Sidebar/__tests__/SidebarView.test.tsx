import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { faHome, faUser, faBox, faUsers, faHardDrive } from '@fortawesome/free-solid-svg-icons';
import { renderWithProviders as render } from '../../../../test/renderWithProviders';
import { mockMatchMedia } from '../../../../test/mockMatchMedia';
import { SidebarView } from '../SidebarView';
import type { SidebarDirectLink, SidebarAccordionSection } from '../SidebarView';

const directLinks: SidebarDirectLink[] = [{ key: 'home', icon: faHome, path: '/', label: 'Home' }];

const accordionSections: SidebarAccordionSection[] = [
  {
    key: 'caster',
    icon: faUser,
    path: '/caster/dashboard',
    label: 'Caster',
    items: [{ path: '/caster/dashboard/groups', icon: faUsers, label: 'Groups' }],
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
    // "caster"'s own path is /caster/dashboard -- being on one of its sibling items
    // (/caster/dashboard/groups) should still highlight "caster" itself, not just the item.
    render(<SidebarView {...baseProps} collapsed={false} activePathname="/caster/dashboard/groups" />);
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
  // Below the breakpoint, only one of {row, list} is ever mounted at a time (AnimatePresence
  // mount/unmount, not the desktop's dual-mount + aria-hidden pattern) so Framer Motion's
  // layoutId can morph each shared item's position/size across that boundary.
  beforeEach(() => {
    mockMatchMedia(true);
  });

  it('mounts only the icon row when collapsed', () => {
    render(<SidebarView {...baseProps} collapsed />);
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-panel')).not.toBeInTheDocument();
  });

  it('mounts only the panel when expanded', () => {
    render(<SidebarView {...baseProps} collapsed={false} />);
    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail')).not.toBeInTheDocument();
  });

  it('collapsed row renders direct links and only sections with no expandable body (no items, no sub-sections)', () => {
    // A section morphs into a plain row icon only if it has nothing to expand. Any section
    // with items and/or nested subSections — "editor" and "caster" in the real config — always
    // renders as a full accordion in the expanded panel instead, and gets no rail icon here.
    const bareSection: SidebarAccordionSection = { key: 'editor', icon: faBox, path: '/editor', label: 'Editor', items: [] };
    render(<SidebarView {...baseProps} collapsed accordionSections={[bareSection, ...accordionSections]} />);
    expect(screen.getByTestId('sidebar-rail-icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-icon-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-icon-caster')).not.toBeInTheDocument();
  });

  it('expanded panel renders the direct links and accordion sections, including nested ones', () => {
    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, caster: true, settings: false }} />);
    expect(screen.getByTestId('sidebar-nav-item-home')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-item-settings')).toBeInTheDocument();
  });

  it('calls onToggleCollapsed when the toggle button is clicked', () => {
    const onToggleCollapsed = vi.fn();
    render(<SidebarView {...baseProps} collapsed onToggleCollapsed={onToggleCollapsed} />);
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });
});
