import s from '../../../components/Start/ReadOption/index.module.css';
import { PlayButton } from '../../../components/PlayButton/PlayButton';
import { Waveform } from '../../../components/Waveform/Waveform';
import spellcastLogo from '../../../../assets/spellcast-logo.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useRef, useState } from 'react';
import { faBookOpenReader, faEject, faFeatherPointed, faHandPointer, faPen, faSpinner, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '../../../components/Buttons/IconButton';
import { RadialMenu, type RadialMenuItem } from '../../../components/RadialMenu/RadialMenu';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addApiResponse } from '../../../../store/apiResponsesSlice';
import { getSpellById } from '../../../../db';
import { useSpellImport } from '../../../../hooks/useSpellImport';
import { usePlaySpell } from '../../../../hooks/usePlaySpell';
import { useSpellCoverUrl } from '../../../../hooks/useSpellCoverUrl';
import { useLanguage } from '../../../../i18n';

interface ReadOptionProps {
  // A spell is being dragged over Start (the drop itself is handled there, so a spell can
  // be dropped anywhere on the section).
  dragActive: boolean;
  // The Spellcast button's menu: Start owns the Write/Import modals these open.
  onWrite: () => void;
  onImport: () => void;
}

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects. Same for blob: URLs, quoted for consistency.
const cssUrl = (url: string) => `url("${url}")`;
const brandMask = cssUrl(spellcastLogo);

const isSpellFile = (file: File) => file.name.toLowerCase().endsWith('.spell');
const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

// Start's central control: the player's own PlayButton as the drop target. Dropping a spell
// starts reading it; so does dropping a .spell file from the computer, which is first
// imported into the browser. With nothing loaded the button shows the Spellcast mark and
// opens a menu floating around it (Write, Import, Editor); once something is loaded it
// plays/pauses it, over that spell's cover filling the panel.
export const ReadOption = ({ dragActive, onWrite, onImport }: ReadOptionProps) => {
  const { t } = useLanguage();
  const { togglePlayback, readSpell, unloadSpell } = usePlaySpell();
  const { importFile } = useSpellImport();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // A file from the computer being dragged over this tab (spells from the grimoire are
  // tracked by Start as `dragActive`).
  const [fileDragActive, setFileDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const { spellId, spellTitle, currentPage, totalPages, isLoaded } = useAppSelector(state => state.spellReader);
  const userId = useAppSelector(state => state.session.userData?.id);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const isPlaying = audioPlaying || browserPlaying;
  const hasSpell = !!spellId;
  const coverUrl = useSpellCoverUrl(spellId, userId);
  // Nothing loaded and nothing being dragged: the button shows the Spellcast mark and opens
  // the menu; a spell dragged over turns it back into a play button.
  const dropping = dragActive || fileDragActive;
  const showBrand = !hasSpell && !dropping;
  // The menu only belongs to the Spellcast button: a drag starting or a spell loading
  // closes it along with that button.
  const showMenu = menuOpen && showBrand;
  const showNowReading = hasSpell && !!spellTitle && !dropping && !importing;

  const menuItems: RadialMenuItem[] = [
    { id: 'write', label: t.start.writeTab, icon: faPen, onSelect: onWrite },
    { id: 'import', label: t.start.importTab, icon: faUpload, onSelect: onImport },
    { id: 'editor', label: t.nav.editor, icon: faFeatherPointed, onSelect: () => navigate('/editor') },
  ];

  // Imports every dropped .spell (saved in the browser, lists refreshed, a toast per file)
  // and starts reading the first one. Anything else is refused here -- PDFs go through
  // Import, which has their review step.
  const openSpellFiles = async (files: File[]) => {
    const spellFiles = files.filter(isSpellFile);
    if (spellFiles.length === 0) {
      dispatch(addApiResponse({ message: t.start.readOnlySpellFiles, type: 'error' }));
      return;
    }
    setImporting(true);
    try {
      const ids = [];
      for (const file of spellFiles) ids.push(await importFile(file));
      const firstId = ids.find((id): id is string => !!id);
      if (!firstId) return;
      const spell = await getSpellById(firstId, userId);
      if (spell) readSpell(spell);
    } finally {
      setImporting(false);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!fileDragActive) setFileDragActive(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setFileDragActive(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setFileDragActive(false);
    void openSpellFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      data-testid="read-option"
      className={`${s.container} ${dropping ? s.dragActive : ''} ${coverUrl ? s.hasCover : s.noCover} ${showMenu ? s.menuOpen : ''}`}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {coverUrl && (
        <>
          <div data-testid="read-option-cover" className={s.panelCover} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
          <div className={s.panelGlow} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
        </>
      )}
      {hasSpell && !dropping && (
        <IconButton
          data-testid="read-option-unload"
          icon={faEject}
          title={t.player.unloadSpell}
          className={`${s.cornerButton} ${s.cornerLeft}`}
          onClick={unloadSpell}
          disabled={importing}
        />
      )}
      {hasSpell && !dropping && (
        <IconButton
          data-testid="read-option-open-reader"
          icon={faBookOpenReader}
          title={t.start.readOpenReader}
          className={`${s.cornerButton} ${s.cornerRight}`}
          onClick={() => navigate(`/spell/${spellId}/reader`)}
        />
      )}
      <div className={s.stage}>
        <span className={s.ring} aria-hidden="true" />
        <span className={`${s.ring} ${s.ringOuter}`} aria-hidden="true" />
        <RadialMenu open={showMenu} items={menuItems} onClose={closeMenu} anchorRef={buttonRef} />
        <div ref={buttonRef} className={s.button}>
          <PlayButton
            size="lg"
            isPlaying={isPlaying}
            active={dropping || showMenu}
            onClick={showBrand ? () => setMenuOpen(open => !open) : togglePlayback}
            title={showBrand ? t.start.readMenu : undefined}
            icon={showBrand ? (
              <span
                data-testid="read-option-brand-icon"
                className={s.brandIcon}
                style={{ maskImage: brandMask, WebkitMaskImage: brandMask }}
                aria-hidden="true"
              />
            ) : undefined}
          />
        </div>
      </div>
      {showNowReading ? (
        <div data-testid="read-option-now" className={s.nowReading}>
          <span className={s.nowStatus}>
            <Waveform active={isPlaying} bars={3} height={10} />
            <span>{isPlaying ? t.start.readNowPlaying : t.start.readPaused}</span>
            {isLoaded && (
              <>
                <span className={s.nowDot} aria-hidden="true">·</span>
                <span>{t.spell.page} {currentPage} {t.spell.of} {totalPages}</span>
              </>
            )}
          </span>
          <span data-testid="read-option-title" className={s.nowTitle} title={spellTitle ?? undefined}>{spellTitle}</span>
        </div>
      ) : (
        <p data-testid="read-option-hint" className={`${s.hint} ${showMenu ? s.hintHidden : ''}`} aria-hidden={showMenu || undefined}>
          <FontAwesomeIcon icon={importing ? faSpinner : faHandPointer} spin={importing} className={s.hintIcon} />
          <span>{importing ? t.start.readImporting : dropping ? t.start.readDropRelease : t.start.readDropHint}</span>
        </p>
      )}
    </div>
  );
};
