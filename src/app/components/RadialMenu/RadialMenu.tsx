import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import s from './RadialMenu.module.css';

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: IconDefinition;
  onSelect: () => void;
}

interface RadialMenuProps {
  open: boolean;
  items: RadialMenuItem[];
  onClose: () => void;
  // Distance from the center to each option, and the arc they're spread over (degrees,
  // 0 = right, 90 = down), so the options avoid whatever sits around the anchor.
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  // The element the menu floats around (e.g. its toggle button): clicks on it are left to
  // it, so toggling it again doesn't count as an outside click that re-closes the menu.
  anchorRef?: React.RefObject<HTMLElement | null>;
  // For the toggle's aria-controls.
  id?: string;
}

// Options floating in an arc around a central control, positioned from its center. Closes
// on Escape, on a click outside it (and its anchor), and after an option is picked.
export const RadialMenu = ({ open, items, onClose, radius = 110, startAngle = 160, endAngle = 20, anchorRef, id }: RadialMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose, anchorRef]);

  const step = items.length > 1 ? (endAngle - startAngle) / (items.length - 1) : 0;

  return (
    <div ref={menuRef} id={id} data-testid="radial-menu" role="menu" aria-hidden={!open} className={`${s.menu} ${open ? s.open : ''}`}>
      {items.map((item, i) => {
        const angle = ((startAngle + step * i) * Math.PI) / 180;
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius);
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            data-testid={`radial-menu-item-${item.id}`}
            className={s.item}
            style={{ '--x': `${x}px`, '--y': `${y}px`, '--i': i } as React.CSSProperties}
            onClick={() => { onClose(); item.onSelect(); }}
          >
            <span className={s.itemIcon}><FontAwesomeIcon icon={item.icon} /></span>
            <span className={s.itemLabel}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
