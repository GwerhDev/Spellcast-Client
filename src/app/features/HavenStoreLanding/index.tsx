import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faStore } from '@fortawesome/free-solid-svg-icons';
import { SectionHeader } from '../../components/SectionHeader';
import { CompanionCard } from '../../components/Cards/CompanionCard';
import { SoundBackgroundCard } from '../../components/Cards/SoundBackgroundCard';
import { PageBackgroundCard } from '../../components/Cards/PageBackgroundCard';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { unlockAsset } from '../../../store/casterInventorySlice';
import { soundBackgrounds, pageBackgrounds, companions } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
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

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const q = query.toLowerCase().trim();
  const matches = (item: { name: string; description: string; tags: string[] }) =>
    !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.tags.some(tag => tag.includes(q));

  const filteredSounds = soundBackgrounds.filter(matches);
  const filteredPages = pageBackgrounds.filter(matches);
  const filteredCompanions = companions.filter(matches);

  const handleUnlock = (id: string) => {
    if (!isUnlocked(id)) dispatch(unlockAsset(id));
  };

  return (
    <div data-testid="haven-store" className={s.container}>
      <SectionHeader icon={faStore} title={t.havenStore.title} subtitle={t.havenStore.subtitle} align="center" />

      <div className={s.panel}>
        <div className={s.panelHeader}>
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
              <div className={s.soundGrid}>
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
              </div>
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.pageBackgrounds}</p>
              <div className={s.pageGrid}>
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
              </div>
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>{t.havenStore.companions}</p>
              <div data-testid="companions-grid" className={s.soundGrid}>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
