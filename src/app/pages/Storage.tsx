import { PageTransition } from '../components/PageTransition';
import { StorageOverview } from '../components/StorageOverview/StorageOverview';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar (its "Storage" tab already identifies
// this section), which every /caster/* route renders under. Its own UserPage.module.css
// .page/.content wrapper is dropped too -- CasterLayout's .content already establishes the
// full-width-then-centered-1024 frame for every /caster/* route; wrapping it again here
// just re-applies the same max-width inside an already-narrower parent, rendering visibly
// narrower and off-center relative to the header/tabs above it instead of matching them.
export const Storage = () => (
  <PageTransition className="dashboard-sections">
    <StorageOverview />
  </PageTransition>
);
