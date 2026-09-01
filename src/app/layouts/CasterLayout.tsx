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
    <div data-testid="caster-layout" className={s.page}>
      <div className={s.content}>
        <CasterHeader username={username} profilePic={profilePic} loader={loader} />
        <SegmentedTabs tabs={tabs} active={active} onChange={handleTabChange} />
        <div className={s.outlet}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
