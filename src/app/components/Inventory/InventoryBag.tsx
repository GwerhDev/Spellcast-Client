import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import type { Asset } from '../../../config/assets';
import { useLanguage, assetName } from '../../../i18n';
import { rectOf } from '../Flight/flightRect';
import type { FlightOrigin } from '../Flight/useFlightTransition';
import { ItemThumbnail } from './ItemThumbnail';
import s from './Inventory.module.css';

export interface BagItem {
  asset: Asset;
  isActive: boolean;
}

interface InventoryBagProps {
  items: BagItem[];
  // With the slot's place on screen, so the item can fly from it into its details.
  onSelect: (asset: Asset, origin: FlightOrigin) => void;
  // The item whose details are open, flown out of its slot: its place stays, empty.
  liftedId?: string | null;
  // Rendered attached to the bag's right edge (e.g. BagFilterTabs).
  tabs?: ReactNode;
}

// The bag always shows at least this many rows, and always whole rows: the column count
// comes from the grid's own auto-fill layout (it spans the full width with fixed-size
// slots), so the empty-slot padding is recomputed whenever the width changes.
const MIN_ROWS = 5;
const FALLBACK_COLUMNS = 8;
const POPOVER_GAP = 8;

interface PopoverState {
  item: BagItem;
  anchor: DOMRect;
}

// The Caster's bag: owned items laid out in fixed slots like an RPG inventory, padded with
// empty slots. Hovering (or focusing) a slot shows a small popover; clicking asks the
// parent to open the item's details.
export const InventoryBag = ({ items, onSelect, liftedId = null, tabs }: InventoryBagProps) => {
  const { t } = useLanguage();
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(FALLBACK_COLUMNS);

  useEffect(() => {
    const el = bagRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const count = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (count > 0) setColumns(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = Math.max(MIN_ROWS, Math.ceil(items.length / columns));
  const emptySlots = rows * columns - items.length;

  const show = (item: BagItem, el: HTMLElement) => setPopover({ item, anchor: el.getBoundingClientRect() });
  const hide = () => setPopover(null);

  return (
    <div className={s.bagWithTabs}>
      <div ref={bagRef} data-testid="inventory-bag" className={s.bag}>
        {items.map(item => (
          <button
            key={item.asset.id}
            type="button"
            data-testid={`bag-slot-${item.asset.id}`}
            className={`${s.slot} ${s.slotFilled} ${item.isActive ? s.slotActive : ''} ${liftedId === item.asset.id ? s.slotLifted : ''}`}
            aria-label={assetName(t, item.asset)}
            onMouseEnter={e => show(item, e.currentTarget)}
            onMouseLeave={hide}
            onFocus={e => show(item, e.currentTarget)}
            onBlur={hide}
            onClick={e => { hide(); onSelect(item.asset, { rect: rectOf(e.currentTarget), element: e.currentTarget }); }}
          >
            <ItemThumbnail asset={item.asset} />
            {item.isActive && (
              <span className={s.slotActiveMark} data-testid={`bag-slot-active-${item.asset.id}`}>
                <FontAwesomeIcon icon={faCheck} />
              </span>
            )}
          </button>
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className={s.slot} data-testid="bag-slot-empty" aria-hidden="true" />
        ))}
      </div>
      {tabs}
      {popover && createPortal(
        <ItemPopover
          item={popover.item}
          name={assetName(t, popover.item.asset)}
          anchor={popover.anchor}
          categoryLabel={t.caster.itemCategory[popover.item.asset.category]}
          activeLabel={t.havenStore.active}
        />,
        document.body,
      )}
    </div>
  );
};

interface ItemPopoverProps {
  item: BagItem;
  name: string;
  anchor: DOMRect;
  categoryLabel: string;
  activeLabel: string;
}

// Positioned against the viewport (portal + fixed) so the section's own scroll container
// can't clip it: above the slot when there's room, otherwise below, kept inside the screen.
const ItemPopover = ({ item, name, anchor, categoryLabel, activeLabel }: ItemPopoverProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const above = anchor.top - height - POPOVER_GAP;
    const top = above >= POPOVER_GAP ? above : anchor.bottom + POPOVER_GAP;
    const centered = anchor.left + anchor.width / 2 - width / 2;
    const left = Math.min(Math.max(centered, POPOVER_GAP), window.innerWidth - width - POPOVER_GAP);
    setPos({ top, left });
  }, [anchor]);

  return (
    <div
      ref={ref}
      role="tooltip"
      data-testid="bag-popover"
      className={`${s.popover} ${pos ? s.popoverVisible : ''}`}
      style={pos ?? { top: 0, left: 0 }}
    >
      <span className={s.popoverName}>{name}</span>
      <span className={s.popoverCategory}>{categoryLabel}</span>
      {item.isActive && (
        <span className={s.popoverActive}>
          <FontAwesomeIcon icon={faCheck} /> {activeLabel}
        </span>
      )}
    </div>
  );
};
