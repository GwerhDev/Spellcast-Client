import { useState } from 'react';
import { faBoxOpen, faLayerGroup, faMusic, faFileLines, faCat, faImage } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../../components/EmptyState';
import { InventoryBag, type BagItem } from '../../components/Inventory/InventoryBag';
import { ItemDetailModal } from '../../components/Inventory/ItemDetailModal';
import { BagFilterTabs, type BagFilterTab } from '../../components/Inventory/BagFilterTabs';
import type { FlightOrigin } from '../../components/Flight/useFlightTransition';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { setActiveSoundBg, setActivePageBg, setActiveCompanion, setActiveCoverFrame } from '../../../store/casterInventorySlice';
import { soundBackgrounds, pageBackgrounds, companions, coverFrames, type Asset, type AssetCategory } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './index.module.css';

// What the Caster owns (unlockedIds), shown as a bag of slots, and the place to equip it.
// The Havenstore only acquires; equipping here dispatches the same setActive* actions the
// contextual surfaces (ReaderSettings, PlayerPreferences) use, so all of them stay in sync.
export const CasterInventoryLanding = () => {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { unlockedIds, activeSoundBgId, activePageBgId, activeCompanionId, activeCoverFrameId } = useAppSelector(state => state.casterInventory);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<FlightOrigin | null>(null);
  const [filter, setFilter] = useState<'all' | AssetCategory>('all');

  const filterTabs: BagFilterTab[] = [
    { id: 'all', label: t.caster.bagFilterAll, icon: faLayerGroup },
    { id: 'sound-background', label: t.havenStore.soundBackgrounds, icon: faMusic },
    { id: 'page-background', label: t.havenStore.pageBackgrounds, icon: faFileLines },
    { id: 'companion', label: t.havenStore.companions, icon: faCat },
    { id: 'cover-frame', label: t.havenStore.coverFrames, icon: faImage },
  ];

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const activeIdFor = (asset: Asset): string | null => {
    switch (asset.category) {
      case 'sound-background': return activeSoundBgId;
      case 'page-background': return activePageBgId;
      case 'companion': return activeCompanionId;
      case 'cover-frame': return activeCoverFrameId;
    }
  };

  const owned: Asset[] = [
    ...soundBackgrounds.filter(bg => isUnlocked(bg.id)),
    ...pageBackgrounds.filter(bg => isUnlocked(bg.id)),
    ...companions.filter(c => !c.comingSoon && isUnlocked(c.id)),
    ...coverFrames.filter(f => isUnlocked(f.id)),
  ];
  const items: BagItem[] = owned.filter(asset => filter === 'all' || asset.category === filter).map(asset => ({ asset, isActive: activeIdFor(asset) === asset.id }));
  const selected = owned.map(asset => ({ asset, isActive: activeIdFor(asset) === asset.id })).find(item => item.asset.id === selectedId) ?? null;

  // Cover frames only ever set/clear the GLOBAL default -- a spell's own explicit pick still
  // overrides it. Page backgrounds always have one, so they can be switched but not cleared.
  const handleToggleActive = (asset: Asset) => {
    const clear = activeIdFor(asset) === asset.id;
    switch (asset.category) {
      case 'sound-background': dispatch(setActiveSoundBg(clear ? null : asset.id)); break;
      case 'page-background': dispatch(setActivePageBg(asset.id)); break;
      case 'companion': dispatch(setActiveCompanion(clear ? null : asset.id)); break;
      case 'cover-frame': dispatch(setActiveCoverFrame(clear ? null : asset.id)); break;
    }
  };

  return (
    <div data-testid="caster-inventory" className={s.container}>
      {owned.length > 0 ? (
        <InventoryBag
          items={items}
          onSelect={(asset, origin) => { setSelectedId(asset.id); setSelectedOrigin(origin); }}
          liftedId={selectedId}
          tabs={<BagFilterTabs tabs={filterTabs} active={filter} onChange={id => setFilter(id as 'all' | AssetCategory)} />}
        />
      ) : (
        <EmptyState icon={faBoxOpen} message={t.caster.inventoryEmpty} testId="inventory-empty" />
      )}
      <ItemDetailModal
        asset={selected?.asset ?? null}
        isActive={!!selected?.isActive}
        canDeactivate={selected?.asset.category !== 'page-background'}
        onToggleActive={handleToggleActive}
        openedFrom={selectedOrigin}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
};
