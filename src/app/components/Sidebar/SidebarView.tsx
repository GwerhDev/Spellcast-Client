import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faChevronDown, faBars } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { SidebarSectionKey } from '../../../store/layoutSlice';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
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
              <FontAwesomeIcon icon={link.icon} />
            </Link>
          </motion.li>
        ))}
        {accordionSections.map(section => (
          <motion.li key={section.key} variants={railItemVariants}>
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
              <FontAwesomeIcon icon={link.icon} />
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

// Mobile: only ONE of {row, list} is ever mounted at a time. Framer Motion's layoutId
// connects the same logical item across that mount/unmount boundary — when the row
// unmounts and the list mounts (or vice versa), each shared-id element animates its own
// position/size change instead of being replaced instantly. "user" (no rail icon at all)
// only exists in the list and just fades in/out normally.
const MobileSidebar = ({
  collapsed,
  openSections,
  activePathname,
  directLinks,
  accordionSections,
  onToggleSection,
  onNavigate,
}: Omit<SidebarViewProps, 'onToggleCollapsed'>) => {
  const morphId = (key: string) => `sidebar-morph-${key}`;
  const morphableSections = accordionSections.filter(section => !section.subSections?.length);
  const nonMorphableSections = accordionSections.filter(section => section.subSections?.length);

  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="popLayout">
        {collapsed ? (
          <motion.nav key="row" className={s.mobileRow} data-testid="sidebar-rail" exit={{ opacity: 0 }}>
            {directLinks.map(link => (
              <motion.div key={link.key} className={s.mobileRowItem} layoutId={morphId(link.key)}>
                <Link
                  to={link.path}
                  title={link.label}
                  data-testid={`sidebar-rail-icon-${link.key}`}
                  className={`${s.railIcon} ${isActive(activePathname, link.path) ? s.railIconActive : ''}`}
                  onClick={onNavigate}
                >
                  <FontAwesomeIcon icon={link.icon} />
                </Link>
              </motion.div>
            ))}
            {morphableSections.map(section => (
              <motion.div key={section.key} className={s.mobileRowItem} layoutId={morphId(section.key)}>
                <Link
                  to={section.path}
                  title={section.label}
                  data-testid={`sidebar-rail-icon-${section.key}`}
                  className={`${s.railIcon} ${isActive(activePathname, section.path) ? s.railIconActive : ''}`}
                  onClick={onNavigate}
                >
                  <FontAwesomeIcon icon={section.icon} />
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        ) : (
          <motion.nav
            key="list"
            className={s.panel}
            data-testid="sidebar-panel"
            exit={{ opacity: 0 }}
          >
            <ul className={s.directLinkList}>
              {directLinks.map(link => (
                <motion.li key={link.key} layoutId={morphId(link.key)}>
                  <Link
                    to={link.path}
                    data-testid={`sidebar-nav-item-${link.key}`}
                    className={`${s.navItem} ${isActive(activePathname, link.path) ? s.activeLink : ''}`}
                    onClick={onNavigate}
                  >
                    <FontAwesomeIcon icon={link.icon} />
                    <span>{link.label}</span>
                  </Link>
                </motion.li>
              ))}
              {morphableSections.map(section => (
                <motion.li key={section.key} layoutId={morphId(section.key)}>
                  <Link
                    to={section.path}
                    data-testid={`sidebar-nav-item-${section.key}`}
                    className={`${s.navItem} ${isActive(activePathname, section.path) ? s.activeLink : ''}`}
                    onClick={onNavigate}
                  >
                    <FontAwesomeIcon icon={section.icon} />
                    <span>{section.label}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            {nonMorphableSections.map(section => (
              <motion.div key={section.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          </motion.nav>
        )}
      </AnimatePresence>
    </LayoutGroup>
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
      {/* Desktop shows a chevron reflecting collapse state; mobile always shows the
          classic burger icon instead. The burger stays fixed in place on mobile; it does
          not participate in the row-to-list morph, but gets the same orbit accent as an
          active nav icon while the menu it controls is open. */}
      <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className={s.toggleIconDesktop} />
      <FontAwesomeIcon icon={faBars} className={s.toggleIconMobile} />
    </button>
  );

  return (
    <div className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : s.sidebarExpanded}`}>
      {isMobile ? <MobileSidebar {...props} /> : <DesktopSidebar {...props} />}
      {toggleButton}
    </div>
  );
};
