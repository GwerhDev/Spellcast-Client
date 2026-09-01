import { PageTransition } from '../components/PageTransition';
import { EmptyState } from '../components/EmptyState';
import { faShare } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';

// TCORE-107 follow-up: real route (mirrors Groups/Storage/Settings as one of the Caster
// tabs), but explicitly a placeholder -- "shared spells" isn't a backend concept yet, same
// mock-and-marked-as-such spirit as CasterProfileLanding's quotes/grimoire. Its own
// title/subtitle heading is dropped -- redundant with CasterLayout's persistent tab bar
// (its "Shared" tab already identifies this section). No "dashboard-sections" className
// here either -- CasterLayout itself now carries that global class as the section's own
// outer scroll frame; applying it again on every nested page stacked a second
// overflow:auto boundary tight around each page's own content (see CasterLayout.tsx).
export const UserShared = () => {
  const { t } = useLanguage();

  return (
    <PageTransition>
      <EmptyState icon={faShare} message={t.shared.empty} testId="caster-shared-empty" />
    </PageTransition>
  );
};
