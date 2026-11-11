import { useLayoutEffect, useRef, useState } from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faBars } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { SidebarSectionKey } from '../../../store/layoutSlice';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import s from './SidebarView.module.css';
import { NavIcon } from '../NavIcon/NavIcon';

export interface SidebarDirectLink {
  key: string;
  icon: IconDefinition;
  path: string;
  label: string;
}

export interface SidebarSectionItem {
  path: string;
  icon: IconDefinition;
  label: string;
}

export interface SidebarAccordionSection {
  key: SidebarSectionKey;
  icon: IconDefinition;
  path: string;
  label: string;
  items: SidebarSectionItem[];
  // Nested sub-sections (their own collapsible accordion), rendered inside this section's
  // body alongside its flat `items` — e.g. "user" nests "storage"/"settings".
  subSections?: SidebarAccordionSection[];
}

interface SidebarViewProps {
  collapsed: boolean;
  openSections: Record<SidebarSectionKey, boolean>;
  activePathname: string;
  directLinks: SidebarDirectLink[];
  accordionSections: SidebarAccordionSection[];
  onToggleCollapsed: () => void;
  onToggleSection: (key: SidebarSectionKey) => void;
  onNavigate?: () => void;
}

const isActive = (activePathname: string, path: string): boolean =>
  activePathname === path || activePathname.startsWith(`${path}/`);

// A top-level accordion section's own `path` is just its default landing route (e.g.
// "caster"'s is /caster/profile) -- being on a SIBLING destination under it (/caster/groups,
// /caster/settings/storage, ...) would fail a plain isActive(section.path) check even though
// the section itself should still read as "active" while you're anywhere inside it. Checks
// the section's own path, every flat item, and recurses into subSections so any depth of
// nesting keeps every ancestor highlighted, not just the one route that matches exactly.
const sectionOrDescendantActive = (section: SidebarAccordionSection, activePathname: string): boolean =>
  isActive(activePathname, section.path)
  || section.items.some(item => isActive(activePathname, item.path))
  || (section.subSections?.some(sub => sectionOrDescendantActive(sub, activePathname)) ?? false);

interface SidebarAccordionProps {
  section: SidebarAccordionSection;
  depth: number;
  openSections: Record<SidebarSectionKey, boolean>;
  activePathname: string;
  collapsed: boolean;
  onToggleSection: (key: SidebarSectionKey) => void;
  onNavigate?: () => void;
}

// Recursive so a section's body can contain both flat sub-items and its own nested
// sub-sections (e.g. "user" containing "storage"/"settings" as independent accordions).
const SidebarAccordion = ({
  section,
  depth,
  openSections,
  activePathname,
  collapsed,
  onToggleSection,
  onNavigate,
}: SidebarAccordionProps) => {
  const open = openSections[section.key];
  const sectionActive = sectionOrDescendantActive(section, activePathname);
  const labelClassName = depth === 0 ? s.sectionLabel : s.subSectionLabel;

  return (
    <div className={s.accordionSection}>
      <div className={`${s.sectionHeader} ${sectionActive ? s.sectionHeaderActive : ''}`}>
        <Link
          to={section.path}
          className={labelClassName}
          data-testid={`sidebar-nav-item-${section.key}`}
          onClick={onNavigate}
          tabIndex={collapsed ? -1 : undefined}
        >
          <NavIcon icon={section.icon} active={sectionActive} />
          <span>{section.label}</span>
        </Link>
        <button
          type="button"
          className={s.sectionChevronWrap}
          data-testid={`sidebar-section-header-${section.key}`}
          aria-expanded={open}
          onClick={() => onToggleSection(section.key)}
          tabIndex={collapsed ? -1 : undefined}
        >
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`${s.sectionChevronArrow} ${open ? s.sectionChevronArrowOpen : ''}`}
          />
        </button>
      </div>
      {open && (
        <div className={s.sectionBody} data-testid={`sidebar-section-body-${section.key}`}>
          {section.items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`sidebar-sub-item-${section.key}-${item.path}`}
              className={`${s.subItem} ${isActive(activePathname, item.path) ? s.activeLink : ''}`}
              onClick={onNavigate}
              tabIndex={collapsed ? -1 : undefined}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          {section.subSections?.map(subSection => (
            <SidebarAccordion
              key={subSection.key}
              section={subSection}
              depth={depth + 1}
              openSections={openSections}
              activePathname={activePathname}
              collapsed={collapsed}
              onToggleSection={onToggleSection}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Desktop: rail (icon rail) and panel (accordion list) — both always mounted, cross-fading
// via CSS opacity as the outer shell's width animates. Each list's items stagger in/out
// (fade + slide) via Framer Motion so the swap reads as a real transition, not an instant one.
const railItemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0 },
};

const panelItemVariants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0 },
};

const DesktopSidebar = ({
  collapsed,
  openSections,
  activePathname,
  directLinks,
  accordionSections,
  onToggleSection,
  onNavigate,
}: Omit<SidebarViewProps, 'onToggleCollapsed'>) => (
  <>
    <nav className={s.rail} data-testid="sidebar-rail" aria-hidden={!collapsed}>
      <motion.ul
        className={s.railList}
        initial={false}
        animate={collapsed ? 'visible' : 'hidden'}
        transition={{ staggerChildren: 0.03 }}
      >
        {directLinks.map(link => (
          <motion.li key={link.key} variants={railItemVariants}>
            <Link
              to={link.path}
              title={link.label}
              data-testid={`sidebar-rail-icon-${link.key}`}
              className={`${s.railIcon} ${isActive(activePathname, link.path) ? s.railIconActive : ''}`}
              onClick={onNavigate}
              tabIndex={collapsed ? undefined : -1}
            >
              <NavIcon icon={link.icon} active={isActive(activePathname, link.path)} />
            </Link>
          </motion.li>
        ))}
        {accordionSections.map(section => (
          <motion.li key={section.key} variants={railItemVariants}>
            <Link
              to={section.path}
              title={section.label}
              data-testid={`sidebar-rail-icon-${section.key}`}
              className={`${s.railIcon} ${sectionOrDescendantActive(section, activePathname) ? s.railIconActive : ''}`}
              onClick={onNavigate}
              tabIndex={collapsed ? undefined : -1}
            >
              <NavIcon icon={section.icon} active={sectionOrDescendantActive(section, activePathname)} />
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </nav>

    <nav className={s.panel} data-testid="sidebar-panel" aria-hidden={collapsed}>
      <motion.ul
        className={s.directLinkList}
        initial={false}
        animate={collapsed ? 'hidden' : 'visible'}
        transition={{ staggerChildren: 0.03 }}
      >
        {directLinks.map(link => (
          <motion.li key={link.key} variants={panelItemVariants}>
            <Link
              to={link.path}
              data-testid={`sidebar-nav-item-${link.key}`}
              className={`${s.navItem} ${isActive(activePathname, link.path) ? s.activeLink : ''}`}
              onClick={onNavigate}
              tabIndex={collapsed ? -1 : undefined}
            >
              <NavIcon icon={link.icon} active={isActive(activePathname, link.path)} />
              <span>{link.label}</span>
            </Link>
          </motion.li>
        ))}
      </motion.ul>

      {accordionSections.map((section, index) => (
        <motion.div
          key={section.key}
          initial={false}
          animate={collapsed ? 'hidden' : 'visible'}
          variants={panelItemVariants}
          transition={{ delay: (directLinks.length + index) * 0.03 }}
        >
          <SidebarAccordion
            section={section}
            depth={0}
            openSections={openSections}
            activePathname={activePathname}
            collapsed={collapsed}
            onToggleSection={onToggleSection}
            onNavigate={onNavigate}
          />
        </motion.div>
      ))}
    </nav>
  </>
);

// Where the mobile menu settles when the finger lets go: a quick flick decides by its direction;
// otherwise it goes to whichever end it was dragged closer to (progress: 0 closed, 1 open).
// eslint-disable-next-line react-refresh/only-export-components
export const settlesOpen = (progress: number, velocityY: number): boolean =>
  velocityY < -300 ? true : velocityY > 300 ? false : progress > 0.5;

// The bar's row: three sections, like the open menu's rows.
const MOBILE_COLUMNS = 3;

// Mobile: the menu is a bar at the bottom of the screen, swiped up to open (and down to close;
// no menu button). Open, it shows just the main sections, each an icon with its name under it,
// straight to its page -- no submenus. There's one grid, always: closed, it's cut down to its
// first row with the names faded out, so opening and closing only grows and shrinks it under
// the finger -- nothing is swapped and no icon moves.
const MobileSidebar = ({
  collapsed,
  activePathname,
  directLinks,
  accordionSections,
  onToggleCollapsed,
  onNavigate,
}: SidebarViewProps) => {
  // The bar shows what it always has first (the direct links and the sections with nothing
  // under them), then the rest.
  const bare = (section: SidebarAccordionSection) => section.items.length === 0 && !section.subSections?.length;
  const entries = [
    ...directLinks.map(link => ({ key: link.key, icon: link.icon, path: link.path, label: link.label, active: isActive(activePathname, link.path) })),
    ...[...accordionSections.filter(bare), ...accordionSections.filter(section => !bare(section))]
      .map(section => ({ key: section.key, icon: section.icon, path: section.path, label: section.label, active: sectionOrDescendantActive(section, activePathname) })),
  ];

  // How open it is, 0 (the bar) to 1 (every section): drives the height and the names' fade.
  const openness = useMotionValue(collapsed ? 0 : 1);
  const height = useMotionValue<number | 'auto'>('auto');
  const [dragging, setDragging] = useState(false);
  const gridRef = useRef<HTMLElement>(null);
  const barHeight = useRef(0);
  const startOpenness = useRef(0);

  // The bar is as tall as it takes to center the first row's icons in it.
  const measure = () => {
    const grid = gridRef.current;
    const icon = grid?.querySelector('svg');
    if (!grid || !icon) return { bar: 0, open: 0 };
    const bar = 2 * (icon.getBoundingClientRect().top + icon.getBoundingClientRect().height / 2 - grid.getBoundingClientRect().top);
    barHeight.current = bar;
    return { bar, open: grid.scrollHeight };
  };
  const heightAt = (o: number) => { const { bar, open } = measure(); return bar + (open - bar) * o; };

  // At rest: the bar's height closed, its own height open.
  useLayoutEffect(() => {
    if (dragging) return;
    openness.set(collapsed ? 0 : 1);
    if (collapsed) height.set(measure().bar || 'auto');
    else height.set('auto');
  }, [collapsed, dragging, entries.length, openness, height]);

  const onPanStart = () => {
    startOpenness.current = openness.get();
    setDragging(true);
  };
  const onPan = (_: PointerEvent, info: { offset: { y: number } }) => {
    const { bar, open } = measure();
    if (open <= bar) return;
    const o = Math.min(1, Math.max(0, startOpenness.current - info.offset.y / (open - bar)));
    openness.set(o);
    height.set(heightAt(o));
  };
  const onPanEnd = (_: PointerEvent, info: { velocity: { y: number } }) => {
    const toOpen = settlesOpen(openness.get(), info.velocity.y);
    const { bar, open } = measure();
    const span = Math.max(1, open - bar);
    animate(openness, toOpen ? 1 : 0, {
      type: 'spring', stiffness: 420, damping: 40, velocity: -info.velocity.y / span,
      onUpdate: o => height.set(heightAt(o)),
    }).then(() => {
      if (toOpen === collapsed) onToggleCollapsed();
      setDragging(false);
    });
  };

  // Closed, what's past the bar's row is out of reach (and out of the way of a screen reader).
  const hidden = (index: number) => collapsed && !dragging && index >= MOBILE_COLUMNS;

  return (
    <motion.div
      className={s.mobileSwipe}
      data-testid="sidebar-swipe"
      onPanStart={onPanStart}
      onPan={onPan}
      onPanEnd={onPanEnd}
    >
      {/* What says it can be swiped. */}
      <span className={s.mobileHandle} aria-hidden="true" />
      <motion.div className={s.mobileBody} style={{ height }}>
        <nav ref={gridRef} className={s.mobileGrid} data-testid={collapsed ? 'sidebar-rail' : 'sidebar-panel'}>
          {entries.map((entry, index) => (
            <div key={entry.key} className={s.mobileTile} aria-hidden={hidden(index) || undefined}>
              <Link
                to={entry.path}
                title={entry.label}
                data-testid={`sidebar-nav-item-${entry.key}`}
                className={`${s.mobileTileLink} ${entry.active ? s.mobileTileActive : ''}`}
                tabIndex={hidden(index) ? -1 : undefined}
                onClick={onNavigate}
              >
                <NavIcon icon={entry.icon} active={entry.active} />
                <motion.span className={s.mobileTileLabel} style={{ opacity: openness }}>{entry.label}</motion.span>
              </Link>
            </div>
          ))}
        </nav>
      </motion.div>
    </motion.div>
  );
};


export const SidebarView = (props: SidebarViewProps) => {
  const { collapsed, onToggleCollapsed } = props;
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const toggleButton = (
    <button
      type="button"
      className={`${s.toggleBtn} ${isMobile && !collapsed ? s.toggleBtnActive : ''}`}
      data-testid="sidebar-toggle-btn"
      onClick={onToggleCollapsed}
    >
      {/* Desktop: three bars, not a FontAwesome glyph — full-width bars when collapsed,
          shrunk to dots when expanded. The width change is transitioned (see .toggleBar),
          so toggling morphs the bars into dots (or back) once, no hover effect or loop.
          Mobile always shows the classic burger icon instead, fixed in place; it does not
          participate in the row-to-list morph, but gets the same orbit accent as an
          active nav icon while the menu it controls is open. */}
      <span
        className={`${s.toggleIconDesktop} ${collapsed ? s.toggleIconBars : s.toggleIconDots}`}
        aria-hidden="true"
      >
        <span className={s.toggleBar} />
        <span className={s.toggleBar} />
        <span className={s.toggleBar} />
      </span>
      <FontAwesomeIcon icon={faBars} className={s.toggleIconMobile} />
    </button>
  );

  // On mobile there's no menu button: the menu is swiped open and closed (see MobileSidebar).
  return (
    <div className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : s.sidebarExpanded}`}>
      {isMobile ? <MobileSidebar {...props} /> : <DesktopSidebar {...props} />}
      {!isMobile && toggleButton}
    </div>
  );
};
