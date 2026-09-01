import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setSectionOpen, toggleSection, toggleSidebarCollapsed, type SidebarSectionKey } from '../../../store/layoutSlice';
import { sidebarDirectLinks, sidebarAccordionSections, type SidebarAccordionSectionConfig } from '../../../config/consts';
import { matchesRoute } from '../../../utils/routeMatch';
import { useLanguage } from '../../../i18n';
import { SidebarView } from '../../components/Sidebar/SidebarView';
import type { SidebarAccordionSection } from '../../components/Sidebar/SidebarView';

interface SidebarProps {
  onNavigate?: () => void;
}

// Collects the keys of every section that should auto-open for the current route: a
// section matching the route directly, one of its own flat `items` matching (e.g. landing
// on /caster/groups -- a sibling of "caster"'s own /caster/profile path, not a descendant
// of it, since TCORE-107's follow-up flattened Groups/Shared/Stats out from under
// /caster/dashboard), PLUS every ancestor of a matching descendant sub-section (e.g.
// landing on /caster/storage/local matches "storage" directly, and "caster" must also open
// since "storage" is nested inside it).
const collectKeysToOpen = (sections: SidebarAccordionSectionConfig[], pathname: string): string[] =>
  sections.flatMap(section => {
    const childKeys = collectKeysToOpen(section.subSections, pathname);
    const selfMatches = matchesRoute(pathname, section.path)
      || section.items.some(item => matchesRoute(pathname, `${section.basePath}${item.path}`));
    return selfMatches || childKeys.length > 0 ? [section.key, ...childKeys] : childKeys;
  });

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, sidebarOpenSections } = useAppSelector(state => state.layout);
  const { pathname } = useLocation();
  const { t } = useLanguage();

  // Auto-open (never auto-close) every section — at any nesting depth — matching the
  // current route, plus every ancestor of a matching section, so landing on e.g.
  // /user/storage/local reveals both "user" and its nested "storage" sub-section, without
  // collapsing any section the user already had open.
  useEffect(() => {
    collectKeysToOpen(sidebarAccordionSections, pathname).forEach(key => {
      if (!sidebarOpenSections[key as SidebarSectionKey]) {
        dispatch(setSectionOpen({ key: key as SidebarSectionKey, open: true }));
      }
    });
    // Only re-run on route change — re-running when sidebarOpenSections changes would fight
    // the user manually closing a section that still matches the current route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const directLinks = sidebarDirectLinks.map(link => ({
    key: link.key,
    icon: link.icon,
    path: link.path,
    label: t.nav[link.key as keyof typeof t.nav] ?? link.key,
  }));

  const resolveSection = (section: SidebarAccordionSectionConfig): SidebarAccordionSection => ({
    key: section.key as SidebarSectionKey,
    icon: section.icon,
    path: section.path,
    label: t.nav[section.key as keyof typeof t.nav] ?? section.key,
    items: section.items.map(item => ({
      path: `${section.basePath}${item.path}`,
      icon: item.icon,
      label: t.nav[item.name.toLowerCase() as keyof typeof t.nav] ?? item.name,
    })),
    subSections: section.subSections.length ? section.subSections.map(resolveSection) : undefined,
  });

  const accordionSections = sidebarAccordionSections.map(resolveSection);

  return (
    <SidebarView
      collapsed={sidebarCollapsed}
      openSections={sidebarOpenSections}
      activePathname={pathname}
      directLinks={directLinks}
      accordionSections={accordionSections}
      onToggleCollapsed={() => dispatch(toggleSidebarCollapsed())}
      onToggleSection={key => dispatch(toggleSection(key))}
      onNavigate={onNavigate}
    />
  );
};
