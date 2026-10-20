import s from './FuseModal.module.css';
import { useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { CustomModal } from './CustomModal';
import { Spinner } from '../Spinner';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';
import { canKeepBoth, type Dissonance, type Resolution } from '../../../utils/spellDiff';
import type { FusePlan, FuseSide } from '../../../utils/spellVersions';
import { imagesIn, textOf } from '../../../utils/wordDiff';

interface FuseModalProps {
  show: boolean;
  // The current version, the one fused into.
  ours: string;
  // The versions that can be fused into it.
  others: string[];
  // The version picked to fuse, and its plan (null while it's being made).
  picked: string | null;
  plan: FusePlan | null;
  // While the fusion is being written.
  busy?: boolean;
  onPick: (name: string) => void;
  onFuse: (resolutions: (Resolution | undefined)[]) => void;
  onClose: () => void;
}

type MergePlan = Extract<FusePlan, { kind: 'merge' }>;

// An image of one side, read when it's shown.
const SideImage = ({ plan, side, path, alt }: { plan: MergePlan; side: FuseSide; path: string; alt: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let cancelled = false;
    plan.readImage(side, path).then(blob => {
      if (cancelled || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    }).catch(() => {});
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, [plan, side, path]);
  return url ? <img className={s.image} src={url} alt={alt} /> : <span className={s.imagePlaceholder}>{alt}</span>;
};

// A page or a block as one side has it: its images and its text.
const Content = ({ plan, side, node }: { plan: MergePlan; side: FuseSide; node: JSONContent }) => {
  const { t } = useLanguage();
  const text = textOf(node);
  return (
    <>
      {imagesIn(node).map(path => <SideImage key={path} plan={plan} side={side} path={path} alt={t.diff.image} />)}
      {text && <p className={s.text}>{text}</p>}
    </>
  );
};

// What one side holds of a dissonance.
const SideValue = ({ plan, dissonance, side }: { plan: MergePlan; dissonance: Dissonance; side: FuseSide }) => {
  const { t } = useLanguage();
  const none = <span className={s.none}>{t.diff.none}</span>;
  switch (dissonance.part) {
    case 'detail':
      return dissonance[side] ? <p className={s.text}>{dissonance[side]}</p> : none;
    case 'cover': {
      const path = plan.cover[side];
      return dissonance[side] && path ? <SideImage plan={plan} side={side} path={path} alt={t.diff.cover} /> : none;
    }
    case 'originalPages':
      return dissonance[side] ? <p className={s.text}>{t.fuse.original}</p> : none;
    case 'page':
    case 'block': {
      const node = dissonance[side];
      return node ? <Content plan={plan} side={side} node={node} /> : <span className={s.none}>{t.fuse.removed}</span>;
    }
    case 'pageLayout': {
      const attrs = Object.entries(dissonance[side] ?? {}).filter(([, value]) => value != null);
      return attrs.length ? <p className={s.text}>{attrs.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</p> : none;
    }
  }
};

// Fusing another version into the current one: the version picked, and what fusing it takes --
// nothing (it's in this one already), moving this one forward to it, or a merge whose
// dissonances are each resolved here (one side kept, or a block both) before it's sealed.
// Closing it writes nothing.
export const FuseModal = ({ show, ours, others, picked, plan, busy, onPick, onFuse, onClose }: FuseModalProps) => {
  const { t } = useLanguage();
  const [resolutions, setResolutions] = useState<(Resolution | undefined)[]>([]);
  useEffect(() => setResolutions([]), [plan]);

  const names = (text: string) => text.split('{ours}').join(ours).split('{theirs}').join(picked ?? '');
  const dissonances = plan?.kind === 'merge' ? plan.merge.dissonances : [];
  const resolvedCount = dissonances.filter((_, k) => resolutions[k]).length;
  const resolve = (k: number, resolution: Resolution) => setResolutions(list => {
    const next = [...list];
    next[k] = resolution;
    return next;
  });

  const labelOf = (dissonance: Dissonance) => {
    switch (dissonance.part) {
      case 'detail': return t.diff.fields[dissonance.field];
      case 'cover': return t.diff.cover;
      case 'originalPages': return t.fuse.original;
      case 'page': return t.fuse.page.replace('{n}', String(dissonance.at + 1));
      case 'block': return t.fuse.block.replace('{n}', String(dissonance.page + 1));
      case 'pageLayout': return t.fuse.layout.replace('{n}', String(dissonance.page + 1));
    }
  };

  let body = null;
  if (picked && !plan) {
    body = <div className={s.loading}><Spinner isLoading /></div>;
  } else if (plan?.kind === 'upToDate') {
    body = <p className={s.note} data-testid="fuse-up-to-date">{names(t.fuse.upToDate)}</p>;
  } else if (plan?.kind === 'fastForward') {
    body = <p className={s.note} data-testid="fuse-fast-forward">{names(t.fuse.fastForward)}</p>;
  } else if (plan?.kind === 'merge' && !dissonances.length) {
    body = <p className={s.note} data-testid="fuse-clean">{names(t.fuse.clean)}</p>;
  } else if (plan?.kind === 'merge') {
    body = (
      <>
        <p className={s.note}>{t.fuse.dissonances}</p>
        <p className={s.count} data-testid="fuse-resolved-count">
          {t.fuse.resolved.replace('{n}', String(resolvedCount)).replace('{total}', String(dissonances.length))}
        </p>
        <ol className={s.dissonances}>
          {dissonances.map((dissonance, k) => (
            <li key={k} className={s.dissonance} data-testid="fuse-dissonance">
              <h4 className={s.label}>{labelOf(dissonance)}</h4>
              <div className={s.sides}>
                {(['ours', 'theirs'] as const).map(side => (
                  <button
                    key={side}
                    type="button"
                    data-testid={`fuse-choice-${side}`}
                    className={`${s.side} ${resolutions[k] === side ? s.chosen : ''}`}
                    aria-pressed={resolutions[k] === side}
                    onClick={() => resolve(k, side)}
                  >
                    <span className={s.sideName}>{side === 'ours' ? ours : picked}</span>
                    <SideValue plan={plan} dissonance={dissonance} side={side} />
                  </button>
                ))}
              </div>
              {canKeepBoth(dissonance) && (
                <button
                  type="button"
                  data-testid="fuse-choice-both"
                  className={`${s.both} ${resolutions[k] === 'both' ? s.chosen : ''}`}
                  aria-pressed={resolutions[k] === 'both'}
                  onClick={() => resolve(k, 'both')}
                >
                  {t.fuse.keepBoth}
                </button>
              )}
            </li>
          ))}
        </ol>
      </>
    );
  }

  const canFuse = !busy && (plan?.kind === 'fastForward' || (plan?.kind === 'merge' && resolvedCount === dissonances.length));

  return (
    <CustomModal compact show={show} onClose={onClose} title={t.fuse.title.replace('{name}', ours)}>
      <div className={s.container} data-testid="fuse-modal">
        {others.length ? (
          <>
            <p className={s.note}>{t.fuse.pick.replace('{name}', ours)}</p>
            <div className={s.versions}>
              {others.map(name => (
                <button
                  key={name}
                  type="button"
                  data-testid={`fuse-version-${name}`}
                  className={`${s.version} ${name === picked ? s.chosen : ''}`}
                  aria-pressed={name === picked}
                  disabled={busy}
                  onClick={() => { if (name !== picked) onPick(name); }}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        ) : <p className={s.note} data-testid="fuse-no-others">{t.fuse.noOthers}</p>}
        {body}
        <div className={s.buttons}>
          {plan?.kind === 'upToDate' ? (
            <PrimaryButton data-testid="fuse-close" onClick={onClose}>{t.common.close}</PrimaryButton>
          ) : (
            <>
              <SecondaryButton data-testid="fuse-cancel" onClick={onClose} disabled={busy}>{t.common.cancel}</SecondaryButton>
              {plan && <PrimaryButton data-testid="fuse-confirm" disabled={!canFuse} onClick={() => onFuse(resolutions)}>{t.fuse.fuse}</PrimaryButton>}
            </>
          )}
        </div>
      </div>
    </CustomModal>
  );
};
