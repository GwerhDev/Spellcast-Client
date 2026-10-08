import s from './index.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faBuildingColumns, faChevronLeft, faChevronRight, faScroll } from '@fortawesome/free-solid-svg-icons';
import { useAppSelector } from '../../../store/hooks';
import { useLanguage } from '../../../i18n';
import { useQuickStartSpells } from '../../../hooks/useQuickStartSpells';
import { getCoverFrame3D, resolveCoverFrameId } from '../../../utils/coverFrame';
import { IconButton } from '../../components/Buttons/IconButton';
import { SpellDetailModal, type SpellDetailOrigin } from '../../components/Modals/SpellDetailModal';
import { LazyHomeScene3D } from '../../components/Cover3D/lazyCover3D';
import { placeValues, spanOf, useCoverflow } from '../../components/Coverflow/useCoverflow';
import type { ScenePlace, SceneRect } from '../../components/Home3D/HomeScene3D';
import type { Spell } from '../../../interfaces';

// The same row as the page's quick start (see QuickStart): its places, a spell in the
// middle and three on each side.
const SLOTS = 7;
// The card leading to the rest of the spells, past the ones the quick start shows.
const MORE_KEY = 'see-all';
// On first showing, the cards spread out from the center one after another (s apart), as
// the page's row does.
const SPREAD_STEP_S = 0.07;

// Each spell's cover as an object URL, made once per cover and revoked once it's gone.
const useCoverUrls = (spells: Spell[]) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const covers = useMemo(() => spells.filter(spell => spell.cover).map(spell => [spell.id, spell.cover!] as const), [spells]);
  useEffect(() => {
    const made: Record<string, string> = {};
    for (const [id, cover] of covers) made[id] = URL.createObjectURL(cover);
    setUrls(made);
    return () => Object.values(made).forEach(url => URL.revokeObjectURL(url));
  }, [covers]);
  return urls;
};

const cardWidthOf = (el: HTMLElement | null) => (el ? parseFloat(getComputedStyle(el).getPropertyValue('--spell-card-width')) || 0 : 0);

// The quick start shown in the home's 3D scene (see HomeScene3D): the same row as the page's
// (see Coverflow, whose layout, turning and gestures it shares through useCoverflow), its
// spells as books. The scene draws the cards; the page keeps the row's place in its layout
// (`Strip`), its arrows, a button per spell for the keyboard and screen readers, and the
// spell's detail, opened from a book the same way it opens from a card.
export const useQuickStart3D = () => {
  const navigate = useNavigate();
  const { isLoading, empty, visible, hasMore } = useQuickStartSpells();
  const activeCoverFrameId = useAppSelector(state => state.casterInventory.activeCoverFrameId);
  const coverUrls = useCoverUrls(visible);
  const [dragging, setDragging] = useState(false);
  const [detail, setDetail] = useState<{ spellId: string; origin: SpellDetailOrigin | null } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  // Where the book's cover was when its detail opened: the cover flies back there.
  const originRef = useRef<HTMLDivElement>(null);

  const keys = useMemo(() => [...visible.map(spell => spell.id), ...(hasMore ? [MORE_KEY] : [])], [visible, hasMore]);
  const row = useCoverflow({ keys, slots: SLOTS, interactive: !isLoading, rootRef, measureItem: () => cardWidthOf(anchorRef.current) });

  const places: ScenePlace[] = row.places.map(({ offset, index, empty: isEmpty, key, behind }) => {
    const spell = isEmpty ? null : visible[index] ?? null;
    const look = placeValues(row.layout, offset);
    // As the page's row brings a card in: spreading out from the center at first; later, from
    // beyond its end as the row turns, or right at its place (new content there).
    const enter = row.spreading.current
      ? { ...placeValues(row.layout, 0), scale: 0.6, opacity: 0, delay: Math.abs(offset) * SPREAD_STEP_S }
      : { ...placeValues(row.layout, row.turning ? offset + Math.sign(offset) : offset), opacity: 0, delay: 0 };
    return {
      key,
      kind: isEmpty ? 'empty' : spell ? 'book' : 'more',
      book: spell ? {
        id: spell.id,
        coverUrl: coverUrls[spell.id] ?? null,
        frame3D: getCoverFrame3D(resolveCoverFrameId(spell.coverFrameId, activeCoverFrameId)),
      } : undefined,
      index,
      behind,
      look,
      enter,
    };
  });

  const open = (index: number, rect: SceneRect | null) => {
    const spell = visible[index];
    if (!spell) return;
    const coverUrl = coverUrls[spell.id];
    let origin: SpellDetailOrigin | null = null;
    if (rect && coverUrl && originRef.current) {
      Object.assign(originRef.current.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      origin = {
        rect,
        coverUrl,
        element: originRef.current,
        coverFrameId: resolveCoverFrameId(spell.coverFrameId, activeCoverFrameId),
      };
    }
    setDetail({ spellId: spell.id, origin });
  };

  return {
    isLoading, empty, visible, hasMore, places, row, dragging, setDragging, detail, setDetail, open,
    seeAll: () => navigate('/grimoire'),
    rootRef, anchorRef, originRef,
  };
};

type QuickStart3DModel = ReturnType<typeof useQuickStart3D>;

// The row's place on the page, with what stays HTML around it.
export const QuickStart3DStrip: React.FC<{ model: QuickStart3DModel }> = ({ model }) => {
  const { t } = useLanguage();
  const { isLoading, empty, visible, hasMore, row, detail, setDetail, open, seeAll, rootRef, anchorRef, originRef } = model;
  if (!isLoading && empty) return null;

  return (
    <>
      <div className={s.container} data-testid="quick-start-3d">
        <div className={s.header} data-dock-reveal>
          <span className={s.grimoireLink} onClick={seeAll}>
            <FontAwesomeIcon icon={faBuildingColumns} />
            {t.nav.grimoire}
            <FontAwesomeIcon icon={faArrowRight} />
          </span>
        </div>
        <div ref={rootRef} className={s.row} data-layout={row.compact ? 'compact' : 'wide'} data-dock-peek>
          {row.showArrows && (
            <IconButton data-testid="quick-start-3d-prev" icon={faChevronLeft} variant="transparent" className={s.nav} title={t.common.previous} onClick={() => row.step(-1)} />
          )}
          <div
            ref={anchorRef}
            data-testid="quick-start-3d-anchor"
            className={s.anchor}
            style={{ width: `calc(var(--spell-card-width) * ${spanOf(row.layout, row.half)})` }}
            {...row.stageHandlers}
          >
            {/* What the row shows, for the keyboard and screen readers (the scene draws it). */}
            <ul className={s.srList}>
              {visible.map((spell, i) => (
                <li key={spell.id}>
                  <button type="button" data-testid={`quick-start-3d-book-${spell.id}`} onFocus={() => row.goTo(i)} onClick={() => open(i, null)}>
                    {spell.title}
                  </button>
                </li>
              ))}
              {hasMore && (
                <li><button type="button" data-testid="quick-start-3d-see-all" onClick={seeAll}>{t.nav.grimoire}</button></li>
              )}
            </ul>
          </div>
          {row.showArrows && (
            <IconButton data-testid="quick-start-3d-next" icon={faChevronRight} variant="transparent" className={s.nav} title={t.common.next} onClick={() => row.step(1)} />
          )}
        </div>
      </div>
      <div ref={originRef} className={s.origin} aria-hidden="true" />
      <SpellDetailModal spellId={detail?.spellId ?? null} show={detail !== null} origin={detail?.origin ?? null} onClose={() => setDetail(null)} />
    </>
  );
};

// The scene drawing the row (see HomeScene3D).
export const QuickStart3DScene: React.FC<{ model: QuickStart3DModel }> = ({ model }) => {
  const { t } = useLanguage();
  const { isLoading, empty, places, row, setDragging, detail, open, seeAll, anchorRef } = model;
  if (!isLoading && empty) return null;
  return (
    <LazyHomeScene3D
      places={places}
      anchor={anchorRef}
      onBring={row.goTo}
      onOpen={open}
      onMore={seeAll}
      onDragChange={setDragging}
      onSettled={() => { row.spreading.current = false; }}
      hiddenId={detail?.origin ? detail.spellId : null}
      moreLabel={t.nav.grimoire}
      moreIcon={faBuildingColumns}
      emptyIcon={faScroll}
    />
  );
};
