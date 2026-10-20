import s from './VersionSelector.module.css';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronDown, faCodeBranch, faCodeMerge, faPlus } from '@fortawesome/free-solid-svg-icons';

interface VersionSelectorProps {
  // null while the versions are being read: disabled meanwhile, named by its title.
  current: string | null;
  versions: string[];
  onSwitch: (name: string) => void;
  onNew: () => void;
  // Fusing another version into the current one (there's none to fuse while it's the only one).
  onFuse: () => void;
  disabled?: boolean;
  labels: { title: string; newVersion: string; fuse: string };
}

// The spell's current version, opening its versions to switch to one, make a new one or fuse
// another one into it.
export const VersionSelector = ({ current, versions, onSwitch, onNew, onFuse, disabled, labels }: VersionSelectorProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (action: () => void) => { setOpen(false); action(); };

  return (
    <div className={s.root} ref={ref}>
      <button
        type="button"
        data-testid="version-selector"
        className={s.trigger}
        title={labels.title}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={current === null}
        disabled={disabled || current === null}
        onClick={() => setOpen(o => !o)}
      >
        <FontAwesomeIcon icon={faCodeBranch} />
        <span className={s.name}>{current ?? labels.title}</span>
        <FontAwesomeIcon icon={faChevronDown} className={s.caret} />
      </button>
      {open && (
        <div className={s.popover} role="menu">
          {versions.map(name => (
            <button
              key={name}
              type="button"
              role="menuitemradio"
              aria-checked={name === current}
              data-testid={`version-option-${name}`}
              className={`${s.item} ${name === current ? s.itemCurrent : ''}`}
              onClick={() => pick(() => { if (name !== current) onSwitch(name); })}
            >
              <span className={s.check}>{name === current && <FontAwesomeIcon icon={faCheck} />}</span>
              <span className={s.name}>{name}</span>
            </button>
          ))}
          <div className={s.divider} />
          <button type="button" role="menuitem" data-testid="version-new" className={s.item} onClick={() => pick(onNew)}>
            <span className={s.check}><FontAwesomeIcon icon={faPlus} /></span>
            <span>{labels.newVersion}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="version-fuse"
            className={s.item}
            disabled={versions.length < 2}
            onClick={() => pick(onFuse)}
          >
            <span className={s.check}><FontAwesomeIcon icon={faCodeMerge} /></span>
            <span>{labels.fuse}</span>
          </button>
        </div>
      )}
    </div>
  );
};
