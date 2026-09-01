import { PageTransition } from '../components/PageTransition';
import { Groups } from '../components/Groups/Groups';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar (its "Groups" tab already identifies
// this section), which every /caster/* route renders under. No "dashboard-sections"
// className here either -- CasterLayout itself now carries that global class as the
// section's own outer scroll frame; applying it again on every nested page stacked a
// second overflow:auto boundary tight around each page's own content (see CasterLayout.tsx).
export const UserGroups = () => (
  <PageTransition>
    <Groups />
  </PageTransition>
);
