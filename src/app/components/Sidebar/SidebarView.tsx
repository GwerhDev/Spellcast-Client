import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { SidebarSectionKey } from '../../../store/layoutSlice';
import s from './SidebarView.module.css';

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
  const sectionActive = isActive(activePathname, section.path);
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
          <FontAwesomeIcon icon={section.icon} />
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

export const SidebarView = ({
  collapsed,
  openSections,
  activePathname,
  directLinks,
  accordionSections,
  onToggleCollapsed,
  onToggleSection,
  onNavigate,
}: SidebarViewProps) => {
  const toggleButton = (
    <button
      type="button"
      className={s.toggleBtn}
      data-testid="sidebar-toggle-btn"
      onClick={onToggleCollapsed}
    >
      <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
    </button>
  );

  return (
    <div className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : s.sidebarExpanded}`}>
      <nav className={s.rail} data-testid="sidebar-rail" aria-hidden={!collapsed}>
        <ul className={s.railList}>
          {directLinks.map(link => (
            <li key={link.key}>
              <Link
                to={link.path}
                title={link.label}
                data-testid={`sidebar-rail-icon-${link.key}`}
                className={`${s.railIcon} ${isActive(activePathname, link.path) ? s.railIconActive : ''}`}
                onClick={onNavigate}
                tabIndex={collapsed ? undefined : -1}
              >
                <FontAwesomeIcon icon={link.icon} />
              </Link>
            </li>
          ))}
          {accordionSections.map(section => (
            <li key={section.key}>
              <Link
                to={section.path}
                title={section.label}
                data-testid={`sidebar-rail-icon-${section.key}`}
                className={`${s.railIcon} ${isActive(activePathname, section.path) ? s.railIconActive : ''}`}
                onClick={onNavigate}
                tabIndex={collapsed ? undefined : -1}
              >
                <FontAwesomeIcon icon={section.icon} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className={s.panel} data-testid="sidebar-panel" aria-hidden={collapsed}>
        <ul className={s.directLinkList}>
          {directLinks.map(link => (
            <li key={link.key}>
              <Link
                to={link.path}
                data-testid={`sidebar-nav-item-${link.key}`}
                className={`${s.navItem} ${isActive(activePathname, link.path) ? s.activeLink : ''}`}
                onClick={onNavigate}
                tabIndex={collapsed ? -1 : undefined}
              >
                <FontAwesomeIcon icon={link.icon} />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {accordionSections.map(section => (
          <SidebarAccordion
            key={section.key}
            section={section}
            depth={0}
            openSections={openSections}
            activePathname={activePathname}
            collapsed={collapsed}
            onToggleSection={onToggleSection}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {toggleButton}
    </div>
  );
};
