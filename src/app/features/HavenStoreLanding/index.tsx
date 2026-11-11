import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { HAVENSTORE_ICON } from '../../../config/consts';
import { SectionHeader } from '../../components/SectionHeader';
import { CompanionCard } from '../../components/Cards/CompanionCard';
import { SoundBackgroundCard } from '../../components/Cards/SoundBackgroundCard';
import { PageBackgroundCard } from '../../components/Cards/PageBackgroundCard';
import { CoverFrameCard } from '../../components/Cards/CoverFrameCard';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { unlockAsset } from '../../../store/casterInventorySlice';
import { soundBackgrounds, pageBackgrounds, companions, coverFrames } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import { Carousel } from '../../components/Carousel/Carousel';
import { useScrolledPast } from '../../../hooks/useScrolledPast';
import s from '../../components/HavenStoreLanding/index.module.css';

// TCORE-109: Havenstore is acquisition-only -- POSSESSION (unlockedIds), never ACTIVATION
// (activeSoundBgId/activePageBgId/activeCompanionId). It only ever dispatches unlockAsset;
// equipping what you own lives at /caster/inventory (CasterInventoryLanding) and in the
// existing contextual surfaces (ReaderSettings, PlayerPreferences) -- all of them dispatch
// the same setActiveXxx actions this page never touches, so they stay in sync regardless of
// where something gets equipped. No tabs either: sounds, pages and companions all render in
// one searchable page (light section headings for scannability, not navigation).
export const HavenStoreLanding = () => {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const { unlockedIds } = useAppSelector(state => state.casterInventory);
  // Scrolled past its heading: the search bar sticks, solid, and takes the heading's title.
  const headingRef = useRef<HTMLSpanElement>(null);
  const stuck = useScrolledPast(headingRef);

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const q = query.toLowerCase().trim();
  const matches = (item: { name: string; description: string; tags: string[] }) =>
    !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.tags.some(tag => tag.includes(q));

  const filteredSounds = soundBackgrounds.filter(matches);
  const filteredPages = pageBackgrounds.filter(matches);
  const filteredCompanions = companions.filter(matches);
  const filteredCoverFrames = coverFrames.filter(matches);

  const handleUnlock = (id: string) => {
    if (!isUnlocked(id)) dispatch(unlockAsset(id));
  };

  return (
    <div data-testid="haven-store" className={s.container}>
      <span ref={headingRef} className={s.header}>
        <SectionHeader icon={HAVENSTORE_ICON} title={t.havenStore.title} subtitle={t.havenStore.subtitle} align="center" />
      </span>

      <div className={s.panel}>
        <div className={`${s.panelHeader} ${stuck ? s.stuck : ''}`} data-testid="haven-bar" data-sticky-bar data-stuck={stuck || undefined}>
          <span className={s.barTitle} aria-hidden={!stuck}>
            <FontAwesomeIcon icon={HAVENSTORE_ICON} className={s.barIcon} />
            {t.havenStore.title}
          </span>
          <div className={s.searchWrapper}>
            <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
            <input
              data-testid="haven-search"
              className={s.searchInput}
              placeholder={t.common.search}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={s.panelBody}>
          <div className={s.body}>
            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.soundBackgrounds}</p>
              <Carousel previousLabel={t.common.previous} nextLabel={t.common.next} itemWidth="168px" aria-label={t.havenStore.soundBackgrounds} data-testid="sounds-carousel">
                {filteredSounds.map(bg => (
                  <SoundBackgroundCard
                    key={bg.id}
                    asset={bg}
                    unlocked={isUnlocked(bg.id)}
                    isActive={false}
                    onAction={handleUnlock}
                    showEquipControls={false}
                  />
                ))}
              </Carousel>
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.pageBackgrounds}</p>
              <Carousel previousLabel={t.common.previous} nextLabel={t.common.next} itemWidth="140px" aria-label={t.havenStore.pageBackgrounds} data-testid="pages-carousel">
                {filteredPages.map(bg => (
                  <PageBackgroundCard
                    key={bg.id}
                    asset={bg}
                    unlocked={isUnlocked(bg.id)}
                    isActive={false}
                    onAction={handleUnlock}
                    showEquipControls={false}
                  />
                ))}
              </Carousel>
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.companions}</p>
              <Carousel previousLabel={t.common.previous} nextLabel={t.common.next} itemWidth="168px" aria-label={t.havenStore.companions} data-testid="companions-grid">
                {filteredCompanions.map(companion => {
                  const comingSoon = !!companion.comingSoon;
                  const unlocked = !comingSoon && isUnlocked(companion.id);
                  return (
                    <CompanionCard
                      key={companion.id}
                      companion={companion}
                      unlocked={unlocked}
                      isActive={false}
                      onAction={handleUnlock}
                      showEquipControls={false}
                    />
                  );
                })}
              </Carousel>
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.coverFrames}</p>
              <Carousel previousLabel={t.common.previous} nextLabel={t.common.next} itemWidth="140px" aria-label={t.havenStore.coverFrames} data-testid="cover-frames-carousel">
                {filteredCoverFrames.map(border => (
                  <CoverFrameCard
                    key={border.id}
                    asset={border}
                    unlocked={isUnlocked(border.id)}
                    isActive={false}
                    onAction={handleUnlock}
                    showEquipControls={false}
                  />
                ))}
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
