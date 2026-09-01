import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../../components/EmptyState';
import { CompanionCard } from '../../components/Cards/CompanionCard';
import { SoundBackgroundCard } from '../../components/Cards/SoundBackgroundCard';
import { PageBackgroundCard } from '../../components/Cards/PageBackgroundCard';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { setActiveSoundBg, setActivePageBg, setActiveCompanion } from '../../../store/casterInventorySlice';
import { soundBackgrounds, pageBackgrounds, companions } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './index.module.css';

// TCORE-109: POSSESSION (what you own -- unlockedIds) + the equip surface for it. Havenstore
// (features/HavenStoreLanding) is acquisition-only now; this is where owned cosmetics get
// activated/deactivated, dispatching the exact same setActiveSoundBg/setActivePageBg/
// setActiveCompanion actions the existing contextual surfaces (ReaderSettings,
// PlayerPreferences) already use -- no new action, no new state, just another dispatcher,
// so equipping from any of them stays in sync everywhere.
export const CasterInventoryLanding = () => {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { unlockedIds, activeSoundBgId, activePageBgId, activeCompanionId } = useAppSelector(state => state.casterInventory);

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const ownedSounds = soundBackgrounds.filter(bg => isUnlocked(bg.id));
  const ownedPages = pageBackgrounds.filter(bg => isUnlocked(bg.id));
  const ownedCompanions = companions.filter(c => !c.comingSoon && isUnlocked(c.id));

  const handleSoundToggle = (id: string) => dispatch(setActiveSoundBg(activeSoundBgId === id ? null : id));
  const handlePageToggle = (id: string) => dispatch(setActivePageBg(id));
  const handleCompanionToggle = (id: string) => dispatch(setActiveCompanion(activeCompanionId === id ? null : id));

  return (
    <div data-testid="caster-inventory" className={s.container}>
      <div className={s.section}>
        <p className={s.sectionLabel}>{t.havenStore.soundBackgrounds}</p>
        {ownedSounds.length > 0 ? (
          <div className={s.soundGrid}>
            {ownedSounds.map(bg => (
              <SoundBackgroundCard
                key={bg.id}
                asset={bg}
                unlocked
                isActive={activeSoundBgId === bg.id}
                onAction={handleSoundToggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={faBoxOpen} message={t.caster.inventoryEmptySounds} />
        )}
      </div>

      <div className={s.section}>
        <p className={s.sectionLabel}>{t.havenStore.pageBackgrounds}</p>
        {ownedPages.length > 0 ? (
          <div className={s.pageGrid}>
            {ownedPages.map(bg => (
              <PageBackgroundCard
                key={bg.id}
                asset={bg}
                unlocked
                isActive={activePageBgId === bg.id}
                onAction={handlePageToggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={faBoxOpen} message={t.caster.inventoryEmptyPages} />
        )}
      </div>

      <div className={s.section}>
        <p className={s.sectionLabel}>{t.havenStore.companions}</p>
        {ownedCompanions.length > 0 ? (
          <div className={s.soundGrid}>
            {ownedCompanions.map(companion => (
              <CompanionCard
                key={companion.id}
                companion={companion}
                unlocked
                isActive={activeCompanionId === companion.id}
                onAction={handleCompanionToggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={faBoxOpen} message={t.caster.inventoryEmptyCompanions} />
        )}
      </div>
    </div>
  );
};
