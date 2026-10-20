import s from './SpellDiffModal.module.css';
import { useEffect, useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { CustomModal } from './CustomModal';
import { Spinner } from '../Spinner';
import { useLanguage } from '../../../i18n';
import type { BlockDiff, PageDiff } from '../../../utils/spellDiff';
import type { ChangesSide, SpellChanges } from '../../../utils/spellVersions';
import { textOf, wordDiff } from '../../../utils/wordDiff';

interface SpellDiffModalProps {
  show: boolean;
  title: string;
  // null while they're being read.
  changes: SpellChanges | null;
  onClose: () => void;
}

// A page's image reference (spell-asset:{name}[;type=...]), the file it's in.
const assetPath = (src: unknown) => {
  const match = typeof src === 'string' ? /^spell-asset:([^;]+)/.exec(src) : null;
  return match ? `assets/${match[1]}` : null;
};

// An image of one side, read when it's shown.
const SideImage = ({ changes, side, path, alt }: { changes: SpellChanges; side: ChangesSide; path: string; alt: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let cancelled = false;
    changes.readImage(side, path).then(blob => {
      if (cancelled || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    }).catch(() => {});
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, [changes, side, path]);
  return url ? <img className={s.image} src={url} alt={alt} /> : <span className={s.imagePlaceholder}>{alt}</span>;
};

// The images in a block, wherever they are in it.
const imagesIn = (node: JSONContent): string[] => {
  const own = node.type === 'image' ? [assetPath(node.attrs?.src)].filter((p): p is string => !!p) : [];
  return [...own, ...(node.content ?? []).flatMap(imagesIn)];
};

type BlockMark = 'same' | 'added' | 'removed' | 'changed' | 'moved';

const Block = ({ changes, node, side, mark, against }: {
  changes: SpellChanges; node: JSONContent; side: ChangesSide; mark: BlockMark; against?: JSONContent;
}) => {
  const { t } = useLanguage();
  const text = textOf(node);
  const images = imagesIn(node);
  const isHeading = node.type === 'heading';
  return (
    <div className={`${s.block} ${s[`block_${mark}`]}`} data-testid={`diff-block-${mark}`}>
      {images.map(path => <SideImage key={path} changes={changes} side={side} path={path} alt={t.diff.image} />)}
      {text && (
        <p className={isHeading ? s.heading : s.text}>
          {mark === 'changed' && against
            ? wordDiff(textOf(against), text).map((segment, k) => (
              <span key={k} className={s[`word_${segment.kind}`]} data-testid={`diff-word-${segment.kind}`}>{segment.text}</span>
            ))
            : text}
        </p>
      )}
    </div>
  );
};

const blocksOf = (page?: JSONContent): JSONContent[] => page?.content ?? [];

// What changed in one page.
const PageDetail = ({ changes, entry }: { changes: SpellChanges; entry: PageDiff }) => {
  const { t } = useLanguage();
  if (entry.kind === 'added') {
    return <>{blocksOf(changes.to.pages[entry.to]).map((b, k) => <Block key={k} changes={changes} node={b} side="to" mark="added" />)}</>;
  }
  if (entry.kind === 'removed') {
    return <>{blocksOf(changes.from.pages[entry.from]).map((b, k) => <Block key={k} changes={changes} node={b} side="from" mark="removed" />)}</>;
  }
  if (entry.kind !== 'changed') {
    return <p className={s.note}>{t.diff.movedFromTo.replace('{from}', String(entry.from + 1)).replace('{to}', String(entry.to + 1))}</p>;
  }
  const from = blocksOf(changes.from.pages[entry.from]);
  const to = blocksOf(changes.to.pages[entry.to]);
  return (
    <>
      {entry.layoutChanged && <p className={s.note}>{t.diff.layoutChanged}</p>}
      {entry.blocks.map((block: BlockDiff, k) => {
        if (block.kind === 'removed') return <Block key={k} changes={changes} node={from[block.from]} side="from" mark="removed" />;
        if (block.kind === 'added') return <Block key={k} changes={changes} node={to[block.to]} side="to" mark="added" />;
        if (block.kind === 'changed') return <Block key={k} changes={changes} node={to[block.to]} side="to" mark="changed" against={from[block.from]} />;
        return <Block key={k} changes={changes} node={to[block.to]} side="to" mark={block.kind} />;
      })}
    </>
  );
};

// What changed between two states of a spell (a seal and the one before it, or the work not
// sealed and the latest seal): its details, tags, cover and original pages, and its pages --
// each changed page's blocks marked, and the words added and taken out of a changed block.
export const SpellDiffModal = ({ show, title, changes, onClose }: SpellDiffModalProps) => {
  const { t } = useLanguage();
  const changedPages = useMemo(() => changes?.diff.pages.filter(page => page.kind !== 'same') ?? [], [changes]);
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [changes]);

  const pageLabel = (entry: PageDiff) => t.diff.page.replace('{n}', String((entry.kind === 'removed' ? entry.from : entry.to) + 1));
  const markLabel: Record<PageDiff['kind'], string> = { added: t.diff.added, removed: t.diff.removed, changed: t.diff.changed, moved: t.diff.moved, same: '' };
  const samePages = changes ? changes.diff.pages.length - changedPages.length : 0;

  let body;
  if (!changes) {
    body = <div className={s.loading}><Spinner isLoading /></div>;
  } else {
    const { diff } = changes;
    const nothing = !diff.details.length && !diff.tags.added.length && !diff.tags.removed.length && !diff.cover && !diff.originalPages && !changedPages.length;
    const entry = changedPages[selected];
    body = (
      <div className={s.container} data-testid="spell-diff">
        {nothing && <p className={s.note} data-testid="diff-nothing">{t.diff.noChanges}</p>}
        {(diff.details.length > 0 || diff.tags.added.length > 0 || diff.tags.removed.length > 0 || diff.cover || diff.originalPages) && (
          <dl className={s.summary}>
            {diff.details.map(detail => (
              <div key={detail.field} className={s.summaryRow} data-testid={`diff-detail-${detail.field}`}>
                <dt>{t.diff.fields[detail.field]}</dt>
                <dd>
                  <span className={s.word_removed}>{detail.from || t.diff.none}</span>
                  {' → '}
                  <span className={s.word_added}>{detail.to || t.diff.none}</span>
                </dd>
              </div>
            ))}
            {(diff.tags.added.length > 0 || diff.tags.removed.length > 0) && (
              <div className={s.summaryRow} data-testid="diff-tags">
                <dt>{t.diff.tags}</dt>
                <dd className={s.chips}>
                  {diff.tags.added.map(tag => <span key={`+${tag}`} className={`${s.chip} ${s.chip_added}`}>+ {tag}</span>)}
                  {diff.tags.removed.map(tag => <span key={`-${tag}`} className={`${s.chip} ${s.chip_removed}`}>− {tag}</span>)}
                </dd>
              </div>
            )}
            {diff.cover && (
              <div className={s.summaryRow} data-testid="diff-cover">
                <dt>{t.diff.cover}</dt>
                <dd className={s.covers}>
                  {(['from', 'to'] as const).map(side => (
                    <figure key={side} className={s.cover}>
                      {changes.cover[side]
                        ? <SideImage changes={changes} side={side} path={changes.cover[side]!} alt={t.diff.cover} />
                        : <span className={s.imagePlaceholder}>{t.diff.none}</span>}
                      <figcaption>{side === 'from' ? t.diff.before : t.diff.after}</figcaption>
                    </figure>
                  ))}
                </dd>
              </div>
            )}
            {diff.originalPages && <p className={s.note}>{t.diff.originalPages}</p>}
          </dl>
        )}
        {changedPages.length > 0 && (
          <div className={s.pages}>
            <ul className={s.pageList} aria-label={t.diff.pages}>
              {changedPages.map((page, k) => (
                <li key={k}>
                  <button
                    type="button"
                    data-testid={`diff-page-${page.kind}`}
                    className={`${s.pageItem} ${k === selected ? s.pageItemSelected : ''}`}
                    aria-pressed={k === selected}
                    onClick={() => setSelected(k)}
                  >
                    <span>{pageLabel(page)}</span>
                    <span className={`${s.badge} ${s[`badge_${page.kind}`]}`}>{markLabel[page.kind]}</span>
                  </button>
                </li>
              ))}
              {samePages > 0 && <li className={s.samePages}>{samePages === 1 ? t.diff.samePage : t.diff.samePages.replace('{n}', String(samePages))}</li>}
            </ul>
            <div className={s.pageDetail} data-testid="diff-page-detail">
              {entry ? <PageDetail changes={changes} entry={entry} /> : <p className={s.note}>{t.diff.pickPage}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <CustomModal show={show} onClose={onClose} title={title}>
      {body}
    </CustomModal>
  );
};
