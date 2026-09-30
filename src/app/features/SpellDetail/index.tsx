import s from '../../components/SpellDetail/index.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById } from '../../../db';
import { useDeleteSpells } from '../../../hooks/useDeleteSpells';
import { hasOriginalPdf } from '../../../db/originalPdfs';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners, getCoverFrame3D } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../../components/CoverFrameCorners';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../../components/Cover3D/constants';
import { useCoverFrame3DSection } from '../../../hooks/useCoverFrame3DSection';
import { Spinner } from '../../components/Spinner';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { IconButton } from '../../components/Buttons/IconButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { EmptyState } from '../../components/EmptyState';
// import { SpellExportModal } from '../../components/Modals/SpellExportModal'; // .spell export: future
import { Tag } from '../../components/Tag/Tag';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpenReader, faScroll, faWandMagicSparkles, faArrowLeft, faTrash, faTriangleExclamation, faFileLines, faChartSimple, faFont, faClock, faLanguage, faCalendar, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { GrimoireStatus } from '../../components/GrimoireStatus/GrimoireStatus';
import { countSpellWords, estimateListeningMinutes } from '../../../utils/spellStats';
import { isInCasterGrimoire } from '../../../utils/grimoire';
import { useLanguage } from '../../../i18n';
// import { useSpellExport } from '../../../hooks/useSpellExport'; // .spell export: future

// TCORE-124: same lazy boundary as SpellCard/EditorPickerCard's own -- see SpellCard's own
// comment on why this stays lazy rather than a static import.
const CoverFrame3DView = React.lazy(() =>
  import('../../components/Cover3D/CoverFrame3DView').then(m => ({ default: m.CoverFrame3DView }))
);

// Matches .cover's own `border-radius: 6px` in SpellDetail/index.module.css -- see
// SpellCard's own COVER_RADIUS comment for why this can't be a shared CSS clip once 3D is
// active.
const COVER_RADIUS = 6;

export const SpellDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logged } = useAppSelector((state) => state.session);
  const { t } = useLanguage();
  const { spellId: currentPlayingId, currentPage: readerCurrentPage, coverFrameChange } = useAppSelector((state) => state.spellReader);
  const deleteSpells = useDeleteSpells();
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getSpellById>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // TCORE-90: the original PDF no longer lives on the Spell record -- its existence is
  // looked up in the dedicated store instead of reading a `pdf` field.
  const [hasPdf, setHasPdf] = useState(false);
  // TCORE-123: the frame itself is edited from the detail modal's cover (SpellCoverModal),
  // not here -- this only resolves and displays whatever is already chosen. See resolveCoverFrameId (utils/coverFrame.ts) for the fallback rule.
  const { activeCoverFrameId } = useAppSelector((state) => state.casterInventory);
  // .spell export UI is hidden for now (not ready to ship this phase) — kept wired but
  // commented out so it's a one-line re-enable later. See the export button below and
  // the SpellExportModal render near the end of this file.
  // const { exportTarget, openExportModal, closeExportModal, handleExport, isExporting } = useSpellExport();
  const headerRef = useRef<HTMLDivElement>(null);
  // TCORE-124: same gate LastSpells/SpellList/EditorSelectLanding use -- see
  // useCoverFrame3DSection/useCoverFrame3DGate for the actual conditions.
  const show3D = useCoverFrame3DSection(headerRef);
  // Walks every page's text: once per spell, not on every progress re-render.
  const wordCount = useMemo(() => countSpellWords(doc?.pagesContent), [doc?.pagesContent]);

  useEffect(() => {
    const load = async () => {
      if (!id || !logged) { setIsLoading(false); return; }
      try {
        const spellDoc = await getSpellById(id, userData.id);
        if (!spellDoc) { setError('Spell not found.'); setIsLoading(false); return; }
        setDoc(spellDoc);
      } catch {
        setError('Failed to load spell.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, logged, userData.id]);

  useEffect(() => {
    if (!doc?.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc?.cover]);

  useEffect(() => {
    if (!doc?.id) { setHasPdf(false); return; }
    hasOriginalPdf(doc.id).then(setHasPdf);
  }, [doc?.id]);

  // A cover frame picked for this spell elsewhere (e.g. the detail modal): applied in place.
  useEffect(() => {
    if (!coverFrameChange || coverFrameChange.spellId !== id) return;
    setDoc(current => (current ? { ...current, coverFrameId: coverFrameChange.coverFrameId } : current));
  }, [coverFrameChange, id]);

  // Only navigation: playback stays exactly as it is (the reader keeps a loaded spell
  // playing or paused, and doesn't start one that wasn't).
  const handleOpenReader = () => navigate(`/spell/${id}/reader`);
  const handleEdit = () => navigate(`/editor/${id}`, { state: { from: location.pathname } });

  const handleDeleteConfirm = async () => {
    if (!id || !userData?.id) return;
    try {
      // Unloads it too, if it's the spell in the player.
      await deleteSpells([id]);
      navigate('/');
    } catch {
      setError('Failed to delete spell.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return (
    <div data-testid="spell-detail-loading" className={s.container}>
      <Spinner isLoading message={t.common.loading} />
    </div>
  );
  if (error || !doc) return (
    <div className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton data-testid="spell-detail-error-back-btn" className={s.backButton} icon={faArrowLeft} variant="transparent" onClick={() => navigate("/")} />
      </div>
      <EmptyState testId="spell-detail-error" icon={faTriangleExclamation} message={error || t.spell.notFound} />
    </div>
  );

  const pagesCount = doc.pagesContent ? JSON.parse(doc.pagesContent).length : null;
  const currentPage = (currentPlayingId === id && readerCurrentPage > 0)
    ? readerCurrentPage
    : (doc.progress?.currentPage ?? 0);
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;
  const resolvedCoverFrameId = resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId);
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);
  const coverFrame3D = show3D ? getCoverFrame3D(resolvedCoverFrameId) : null;
  // Only the caster's own transcriptions can be edited or deleted; a spell outside their
  // grimoire (once shared spells can be opened here) offers transcribing it instead.
  const inGrimoire = isInCasterGrimoire(doc.userId, userData?.id);
  const listeningMinutes = wordCount ? estimateListeningMinutes(wordCount) : null;
  const listeningLabel = listeningMinutes === null ? null
    : listeningMinutes < 60
      ? t.spell.durationMinutes.replace('{m}', String(listeningMinutes))
      : t.spell.durationHours.replace('{h}', String(Math.floor(listeningMinutes / 60))).replace('{m}', String(listeningMinutes % 60));
  const hasAbout = !!(doc.description || doc.tags?.length);

  return (
    <div data-testid="spell-detail" className={s.container}>
      <div className={s.pageInfoContainer}>
        <IconButton className={s.backButton} icon={faArrowLeft} variant="transparent" onClick={() => navigate("/")} />
      </div>
      <div className={s.detailsContainer}>
        <div className={s.header} ref={headerRef}>
          {coverUrl
            ? (
              <div className={s.coverWrap}>
                {coverFrame3D
                  // See SpellCard's own comment on this same fork -- the actual cover
                  // pixels render inside CoverFrame3DView's textured plane below.
                  ? <div className={s.cover} style={getCoverFrameStyle(resolvedCoverFrameId)} role="img" aria-label={doc.title} />
                  : <img src={coverUrl} alt={doc.title} className={s.cover} style={getCoverFrameStyle(resolvedCoverFrameId)} />}
                {coverFrameCorners && (
                  <div className={s.coverFrameSlot} style={coverFrame3D ? ({ '--cover-frame-3d-margin-x': `${VIEW_MARGIN_X}px`, '--cover-frame-3d-margin-y': `${VIEW_MARGIN_Y}px` } as React.CSSProperties) : undefined}>
                    {coverFrame3D
                      ? (
                        <React.Suspense fallback={null}>
                          <CoverFrame3DView config={coverFrame3D} coverUrl={coverUrl!} radius={COVER_RADIUS} />
                        </React.Suspense>
                      )
                      : <CoverFrameCorners config={coverFrameCorners} />}
                  </div>
                )}
              </div>
            )
            : <FontAwesomeIcon icon={faScroll} size="4x" className={s.icon} />
          }
          <div className={s.info}>
            <h1 data-testid="spell-detail-title" className={s.title}>{doc.title}</h1>
            {doc.author && <p data-testid="spell-detail-author" className={s.author}>{doc.author}</p>}
            <GrimoireStatus
              inGrimoire={inGrimoire}
              inGrimoireLabel={t.spell.inGrimoire}
              transcribeLabel={t.spell.transcribeToGrimoire}
            />
            <div className={s.tags}>
              {hasPdf && <span data-testid="spell-detail-pdf-tag"><Tag tone="default" size="sm">PDF</Tag></span>}
              {currentPage > 0 && progressPct !== null && (
                <Tag tone={progressPct === 100 ? 'ok' : 'primary'} size="sm">{progressPct}%</Tag>
              )}
              {!doc.pagesContent && <Tag tone="warning" size="sm">Unprocessed</Tag>}
            </div>
            {progressPct !== null && (
              <div className={s.progress}>
                <div className={s.progressBarContainer}>
                  <div className={s.progressBarFill} style={{ width: `${progressPct}%` }} />
                </div>
                <p className={s.progressText}>{t.spell.page} {currentPage} {t.spell.of} {pagesCount}</p>
              </div>
            )}
            <div className={s.actions}>
              <PrimaryButton data-testid="spell-detail-continue-btn" icon={faBookOpenReader} onClick={handleOpenReader}>{t.spell.openInReader}</PrimaryButton>
              {inGrimoire && <SecondaryButton data-testid="spell-detail-edit-btn" icon={faWandMagicSparkles} onClick={handleEdit}>{t.spell.editSpell}</SecondaryButton>}
              {/* .spell export: future
              <SecondaryButton data-testid="spell-detail-export-btn" icon={faFileExport} onClick={() => openExportModal({ id: doc.id, title: doc.title })}>{t.spell.exportSpell}</SecondaryButton>
              */}
              {inGrimoire && <PrimaryButton data-testid="spell-detail-delete-btn" variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>{t.common.delete}</PrimaryButton>}
            </div>
          </div>
        </div>
        <div className={`${s.body} ${hasAbout ? '' : s.bodySingle}`}>
          {hasAbout && (
            <section className={s.section} data-testid="spell-detail-metadata">
              {doc.description && (
                <>
                  <h2 className={s.sectionHeading}>{t.spell.descriptionHeading}</h2>
                  <p className={s.description} data-testid="spell-detail-description">{doc.description}</p>
                </>
              )}
              {!!doc.tags?.length && (
                <>
                  <h2 className={s.sectionHeading}>{t.spell.tagsHeading}</h2>
                  <div className={s.metadataTags} data-testid="spell-detail-tags">
                    {doc.tags.map((tag) => <Tag key={tag} tone="default" size="sm">{tag}</Tag>)}
                  </div>
                </>
              )}
            </section>
          )}
          <section className={s.section} data-testid="spell-detail-stats">
            <h2 className={s.sectionHeading}>{t.spell.detailsHeading}</h2>
            <dl className={s.stats}>
              {pagesCount !== null && (
                <div className={s.stat}><dt><FontAwesomeIcon icon={faFileLines} />{t.spell.statPages}</dt><dd>{pagesCount}</dd></div>
              )}
              <div className={s.stat}>
                <dt><FontAwesomeIcon icon={faChartSimple} />{t.spell.statProgress}</dt>
                <dd>{progressPct !== null ? `${progressPct}%` : t.spell.statNotStarted}</dd>
              </div>
              {!!wordCount && (
                <div className={s.stat}><dt><FontAwesomeIcon icon={faFont} />{t.spell.statWords}</dt><dd data-testid="spell-detail-words">{wordCount.toLocaleString()}</dd></div>
              )}
              {listeningLabel && (
                <div className={s.stat}><dt><FontAwesomeIcon icon={faClock} />{t.spell.statListening}</dt><dd data-testid="spell-detail-listening">{listeningLabel}</dd></div>
              )}
              {doc.language && (
                <div className={s.stat}><dt><FontAwesomeIcon icon={faLanguage} />{t.spell.statLanguage}</dt><dd data-testid="spell-detail-language">{doc.language}</dd></div>
              )}
              <div className={s.stat}>
                <dt><FontAwesomeIcon icon={faCalendar} />{t.spell.statAdded}</dt>
                <dd>{new Date(doc.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className={s.stat}>
                <dt><FontAwesomeIcon icon={faFilePdf} />{t.spell.statOriginalPdf}</dt>
                <dd>{hasPdf ? t.spell.statKept : t.spell.statNotKept}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t.spell.deleteTitle}
        message={t.spell.deleteConfirm.replace('{title}', doc.title)}
      />
      {/* .spell export: future — re-enable the useSpellExport() hook above and this block.
      {exportTarget && (
        <SpellExportModal
          show={!!exportTarget}
          title={exportTarget.title}
          isExporting={isExporting}
          onClose={closeExportModal}
          onExport={handleExport}
        />
      )} */}
    </div>
  );
};
