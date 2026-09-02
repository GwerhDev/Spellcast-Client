import s from './CasterLayout.module.css';
import { useSelector } from 'react-redux';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { CasterHeader } from '../components/CasterHeader/CasterHeader';
import { SegmentedTabs, SegmentedTab } from '../components/Tabs/SegmentedTabs';
import { casterTabs } from '../../config/consts';
import { matchesRoute } from '../../utils/routeMatch';
import { useLanguage } from '../../i18n';

// TCORE-107 follow-up: the header (avatar/XP) and the tab bar are now a persistent shell
// wrapping every /caster/* route (Profile/Stats/Groups/Shared/Storage/Settings, including
// their own sub-routes) -- landing directly on any of them, or navigating between them,
// keeps the same header+tabs, only the body below (the route's own <Outlet /> content)
// changes. The tab set mirrors sidebarAccordionSections' "caster" entry (see casterTabs in
// config/consts.ts) so the sidebar and this tab bar can never drift apart.
//
// This IS the "dashboard-sections" for the whole /caster/* section -- the shared global
// class (src/styles/globals.css) that gives a page its flex-grow+scroll frame, normally
// applied once by whichever page mounts directly under .app-viewer. Since CasterLayout is
// now that direct child instead, it carries the class itself; the individual routed pages
// underneath (Storage, Settings, Appearance, etc.) render their own <PageTransition> WITHOUT
// it, since they're no longer that outer "section" -- applying it a second time, on each of
// them too, stacked another overflow:auto boundary right around each page's own content,
// close enough to clip things like a hover glow that bleeds past a card's own edges.
// .page (below) adds only the one thing CasterLayout needs on top of that: centering
// .content.
export const CasterLayout = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { username, profilePic, loader } = useSelector((state: RootState) => state.session.userData);

  const tabs: SegmentedTab[] = casterTabs.map(tab => ({
    id: tab.id,
    icon: tab.icon,
    label: t.nav[tab.id as keyof typeof t.nav] ?? tab.id,
  }));

  const active = casterTabs.find(tab => matchesRoute(pathname, tab.path))?.id ?? '';

  const handleTabChange = (id: string) => {
    const tab = casterTabs.find(t => t.id === id);
    if (tab) navigate(tab.path);
  };

  return (
    <div data-testid="caster-layout" className={`dashboard-sections ${s.page}`}>
      <div className={s.content}>
        <CasterHeader username={username} profilePic={profilePic} loader={loader} />
        <div className={s.stickyTabs}>
          <SegmentedTabs tabs={tabs} active={active} onChange={handleTabChange} />
        </div>
        <div className={s.outlet}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
