import { PlayButton } from '../../../components/PlayButton/PlayButton';
import { AltarPanel } from '../../../components/Altar/AltarPanel';
import { AltarBrandIcon, AltarCornerButton, AltarHint, AltarNowReading, AltarSentence, AltarWave } from '../../../components/Altar/AltarParts';
import { activeSentenceIndex } from '../../../../utils/activeSentence';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { faBookOpenReader, faEject, faFeatherPointed, faPen, faTrash, faUpload, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { RadialMenu, type RadialMenuItem } from '../../../components/RadialMenu/RadialMenu';
import { DeleteConfirmModal } from '../../../components/Modals/DeleteConfirmModal';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addApiResponse } from '../../../../store/apiResponsesSlice';
import { getSpellById } from '../../../../db';
import { useDeleteSpells } from '../../../../hooks/useDeleteSpells';
import { useSpellImport } from '../../../../hooks/useSpellImport';
import { usePlaySpell } from '../../../../hooks/usePlaySpell';
import { useSpellCoverUrl } from '../../../../hooks/useSpellCoverUrl';
import { isInCasterGrimoire } from '../../../../utils/grimoire';
import { useDragPointer } from '../../../../hooks/useDragPointer';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import { useLanguage } from '../../../../i18n';

interface AltarProps {
  // The Spellcast button's menu: Start owns the Write/Import modals these open.
  onWrite: () => void;
  onImport: () => void;
}

const isSpellFile = (file: File) => file.name.toLowerCase().endsWith('.spell');
const hasType = (e: React.DragEvent, type: string) => Array.from(e.dataTransfer.types).includes(type);
const isSpellDrag = (e: React.DragEvent) => hasType(e, SPELL_DRAG_TYPE);
const isFileDrag = (e: React.DragEvent) => hasType(e, 'Files');

// While a spell is dragged over the altar, the button glows brighter the closer it gets
// (within GLOW_RANGE px of its center).
const GLOW_RANGE = 420;

// The altar: Start's central panel, where a spell is placed to be read. The panel itself is
// the drop target: dropping a spell from the grimoire starts reading it, and so does
// dropping a .spell file from the computer, which is first imported into the browser.
// With nothing loaded the button shows the Spellcast mark and opens a menu floating around
// it (Write, Import, Editor); once something is loaded, that spell's cover fills the panel.
export const Altar = ({ onWrite, onImport }: AltarProps) => {
  const { t } = useLanguage();
  const { readSpell, unloadSpell, togglePlayback } = usePlaySpell();
  const { importFile } = useSpellImport();
  const deleteSpells = useDeleteSpells();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const centerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // What's being dragged over the panel, if anything droppable: a spell from the grimoire
  // or files from the computer.
  const [spellDragActive, setSpellDragActive] = useState(false);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { spellId, spellTitle, spellUserId, currentPage, totalPages, isLoaded, sentences, currentSentenceIndex } = useAppSelector(state => state.spellReader);
  const voiceType = useAppSelector(state => state.voice.selectedVoice.type);
  const { timeline: providerTimeline, currentTime: providerCurrentTime } = useAppSelector(state => state.audioPlayer);
  const userId = useAppSelector(state => state.session.userData?.id);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const isPlaying = audioPlaying || browserPlaying;
  const hasSpell = !!spellId;
  // Edit and delete are only offered for the caster's own transcriptions.
  const inGrimoire = hasSpell && isInCasterGrimoire(spellUserId, userId);
  const coverUrl = useSpellCoverUrl(spellId, userId);
  // Nothing loaded and nothing being dragged: the button shows the Spellcast mark and opens
  // the menu; something dragged over turns it back into a play button.
  const dropping = spellDragActive || fileDragActive;
  const showBrand = !hasSpell && !dropping;
  // The menu only belongs to the Spellcast button: a drag starting or a spell loading
  // closes it along with that button.
  const showMenu = menuOpen && showBrand;
  const showNowReading = hasSpell && !!spellTitle && !dropping && !importing;
  // With a spell loaded, the center shows the audio waveform (animated while reading, flat
  // while paused) instead of the play/pause button -- display only, playback is driven from
  // the player. A drag or an import brings the button back as the drop target.
  const showWaveform = hasSpell && !dropping && !importing;
  // While it plays, the footer follows the voice: the sentence being read (a provider
  // voice's own timeline text, which is what its audio says; the page's sentence for the
  // browser voice). Paused, it's the status and title again.
  const sentenceIndex = activeSentenceIndex(voiceType, currentSentenceIndex, providerTimeline, providerCurrentTime);
  const currentSentence = (voiceType === 'ai' && providerTimeline.length > 0
    ? providerTimeline[sentenceIndex]?.text
    : sentences[sentenceIndex])?.trim();
  const showSentence = showNowReading && isPlaying && !!currentSentence;

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

  const openDroppedSpell = async (droppedId: string) => {
    try {
      const spell = await getSpellById(droppedId, userId);
      if (spell) readSpell(spell);
    } catch (error) {
      console.error('Failed to load dropped spell:', error);
    }
  };

  // The spell deleted here is the loaded one, so this also unloads it.
  const handleDeleteConfirm = async () => {
    if (!spellId) return;
    await deleteSpells([spellId]);
    setShowDeleteModal(false);
  };

  // A dragged spell's pointer, as CSS variables on the panel (no re-render per move): a
  // beam of light from the pointer onto the button, anchored at the button's center and
  // reaching out to the pointer (--beam-x/-y, --beam-length, --beam-angle), with a spark
  // at the pointer end (--spark-x/-y). The button stays put and glows brighter as the
  // spell nears (--proximity, 0..1, on the stage). Cleared when the drag ends, so the beam
  // fades out where it was.
  useDragPointer(spellDragActive, (x, y) => {
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!panel || !stage) return;
    const box = panel.getBoundingClientRect();
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.hypot(dx, dy);
    panel.style.setProperty('--beam-x', `${(cx - box.left).toFixed(1)}px`);
    panel.style.setProperty('--beam-y', `${(cy - box.top).toFixed(1)}px`);
    panel.style.setProperty('--beam-length', `${distance.toFixed(1)}px`);
    panel.style.setProperty('--beam-angle', `${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1)}deg`);
    panel.style.setProperty('--spark-x', `${(x - box.left).toFixed(1)}px`);
    panel.style.setProperty('--spark-y', `${(y - box.top).toFixed(1)}px`);
    panel.style.setProperty('--beam-opacity', '1');
    stage.style.setProperty('--proximity', Math.max(0, 1 - distance / GLOW_RANGE).toFixed(2));
  });

  useEffect(() => {
    if (spellDragActive) return;
    panelRef.current?.style.removeProperty('--beam-opacity');
    stageRef.current?.style.removeProperty('--proximity');
  }, [spellDragActive]);

  // A drag can also end without ever leaving the panel (Esc, or dropped somewhere that isn't
  // a target); dragend fires on the dragged card and bubbles up to the document either way.
  useEffect(() => {
    if (!spellDragActive) return;
    const end = () => setSpellDragActive(false);
    document.addEventListener('dragend', end);
    document.addEventListener('drop', end);
    return () => {
      document.removeEventListener('dragend', end);
      document.removeEventListener('drop', end);
    };
  }, [spellDragActive]);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setSpellDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isSpellDrag(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!spellDragActive) setSpellDragActive(true);
      return;
    }
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!fileDragActive) setFileDragActive(true);
  };

  // Only a leave toward somewhere outside the panel ends the drag state; moving between its
  // own children also fires dragleave. (Not counted enter/leave pairs: an element the drag
  // entered through can be removed mid-drag, and a removed node never gets its leave.)
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSpellDrag(e) && !isFileDrag(e)) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setSpellDragActive(false);
    setFileDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isSpellDrag(e)) {
      e.preventDefault();
      setSpellDragActive(false);
      const droppedId = e.dataTransfer.getData(SPELL_DRAG_TYPE);
      if (droppedId) void openDroppedSpell(droppedId);
      return;
    }
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setFileDragActive(false);
    void openSpellFiles(Array.from(e.dataTransfer.files));
  };

  const hintText = importing ? t.start.readImporting : dropping ? t.start.readDropRelease : t.start.readDropHint;

  return (
    <AltarPanel
      coverUrl={coverUrl}
      highlighted={dropping}
      menuOpen={showMenu}
      panelRef={panelRef}
      stageRef={stageRef}
      centerRef={centerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      leftCorner={hasSpell && !dropping && (
        <AltarCornerButton data-testid="altar-unload" icon={faEject} title={t.player.unloadSpell} onClick={unloadSpell} disabled={importing} />
      )}
      rightCorner={hasSpell && !dropping && (
        <>
          <AltarCornerButton data-testid="altar-open-reader" icon={faBookOpenReader} title={t.spell.openInReader} onClick={() => navigate(`/spell/${spellId}/reader`)} />
          {inGrimoire && (
            <>
              <AltarCornerButton
                data-testid="altar-edit"
                icon={faWandMagicSparkles}
                title={t.spell.editSpell}
                onClick={() => navigate(`/editor/${spellId}`, { state: { from: location.pathname } })}
              />
              <AltarCornerButton data-testid="altar-delete" icon={faTrash} title={t.common.delete} danger onClick={() => setShowDeleteModal(true)} disabled={importing} />
            </>
          )}
        </>
      )}
      stageOverlay={<RadialMenu id={menuId} open={showMenu} items={menuItems} onClose={closeMenu} anchorRef={centerRef} />}
      center={showWaveform ? <AltarWave active={isPlaying} /> : (
        <PlayButton
          size="lg"
          isPlaying={isPlaying}
          active={dropping || showMenu}
          onClick={showBrand ? () => setMenuOpen(open => !open) : togglePlayback}
          title={showBrand ? t.start.readMenu : undefined}
          hasPopup={showBrand ? 'menu' : undefined}
          expanded={showMenu}
          controls={menuId}
          icon={showBrand ? <AltarBrandIcon /> : undefined}
        />
      )}
      footer={showSentence ? (
        <AltarSentence text={currentSentence!} sentenceKey={`${currentPage}-${sentenceIndex}`} />
      ) : showNowReading ? (
        <AltarNowReading
          status={isPlaying ? t.start.readNowPlaying : t.start.readPaused}
          page={isLoaded ? `${t.spell.page} ${currentPage} ${t.spell.of} ${totalPages}` : undefined}
          title={spellTitle ?? ''}
        />
      ) : (
        <AltarHint text={hintText} busy={importing} hidden={showMenu} />
      )}
    >
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t.spell.deleteTitle}
        message={t.spell.deleteConfirm.replace('{title}', spellTitle ?? '')}
      />
    </AltarPanel>
  );
};
