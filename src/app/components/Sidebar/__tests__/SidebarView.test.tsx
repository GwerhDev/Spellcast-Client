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
    key: 'user',
    icon: faUser,
    path: '/user/dashboard',
    label: 'User',
    items: [{ path: '/user/dashboard/groups', icon: faUsers, label: 'Groups' }],
    subSections: [
      {
        key: 'storage',
        icon: faBox,
        path: '/user/storage',
        label: 'Storage',
        items: [{ path: '/user/storage/local', icon: faHardDrive, label: 'Local' }],
      },
    ],
  },
];

const baseProps = {
  directLinks,
  accordionSections,
  activePathname: '/',
  openSections: { editor: false, user: false, storage: false, settings: false },
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
    expect(screen.getByTestId('sidebar-rail-icon-user')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-icon-storage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-section-body-user')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('sidebar-section-header-user'));
    expect(onToggleSection).toHaveBeenCalledWith('user');
  });

  it('does not render a section body until its section is open', () => {
    render(<SidebarView {...baseProps} collapsed={false} />);
    expect(screen.queryByTestId('sidebar-section-body-user')).not.toBeInTheDocument();
  });

  it('supports multiple sections open at the same time', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        openSections={{ editor: false, user: true, storage: true, settings: false }}
      />
    );
    expect(screen.getByTestId('sidebar-section-body-user')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-storage')).toBeInTheDocument();
  });

  it('renders a nested sub-section only once its parent section is open', () => {
    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, user: false, storage: false, settings: false }} />);
    expect(screen.queryByTestId('sidebar-nav-item-storage')).not.toBeInTheDocument();

    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, user: true, storage: false, settings: false }} />);
    expect(screen.getByTestId('sidebar-nav-item-storage')).toBeInTheDocument();
    // The nested sub-section's own body (its sub-items) stays closed independently.
    expect(screen.queryByTestId('sidebar-section-body-storage')).not.toBeInTheDocument();
  });

  it('opens a nested sub-section independently once both it and its parent are open', () => {
    render(
      <SidebarView
        {...baseProps}
        collapsed={false}
        openSections={{ editor: false, user: true, storage: true, settings: false }}
      />
    );
    expect(screen.getByTestId('sidebar-section-body-storage')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-sub-item-storage-/user/storage/local')).toBeInTheDocument();
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
        activePathname="/user/storage/local"
        openSections={{ editor: false, user: true, storage: true, settings: false }}
      />
    );
    expect(screen.getByTestId('sidebar-sub-item-storage-/user/storage/local').className).toMatch(/activeLink/);
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

  it('collapsed row renders direct links and top-level section icons only', () => {
    render(<SidebarView {...baseProps} collapsed />);
    expect(screen.getByTestId('sidebar-rail-icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-icon-user')).toBeInTheDocument();
  });

  it('expanded panel renders the direct links and accordion sections, including nested ones', () => {
    render(<SidebarView {...baseProps} collapsed={false} openSections={{ editor: false, user: true, storage: false, settings: false }} />);
    expect(screen.getByTestId('sidebar-nav-item-home')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-item-storage')).toBeInTheDocument();
  });

  it('calls onToggleCollapsed when the toggle button is clicked', () => {
    const onToggleCollapsed = vi.fn();
    render(<SidebarView {...baseProps} collapsed onToggleCollapsed={onToggleCollapsed} />);
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });
});
