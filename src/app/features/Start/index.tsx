import s from '../../components/Start/index.module.css';
import { useEffect, useRef, useState } from 'react';
import { TextOption } from './TextOption';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { ImportOption } from './ImportOption';
import { ReadOption } from './ReadOption';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById, hasSpellsInDB } from '../../../db';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { useLanguage } from '../../../i18n';
import { faBookOpen, faPen, faUpload } from '@fortawesome/free-solid-svg-icons';

const isSpellDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(SPELL_DRAG_TYPE);

export const Start = () => {
  const [inputType, setInputType] = useState('text');
  // null until the first check answers: the tabs wait for it, so Start opens directly on its
  // real default (Read when there are spells) instead of showing Text and then jumping.
  const [hasSpellsKnown, setHasSpells] = useState<boolean | null>(null);
  const hasSpells = !!hasSpellsKnown;
  const [dragActive, setDragActive] = useState(false);
  // Once the user picks a tab, the default-tab logic below stops overriding their choice.
  const userPickedTab = useRef(false);
  const dispatch = useDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const listVersion = useAppSelector(state => state.spellReader.listVersion);
  const { readSpell } = usePlaySpell();
  const { t } = useLanguage();

  // Only asks whether any spell exists (a count, no records loaded) -- Start doesn't need the
  // spells themselves, just whether to offer the Read tab.
  useEffect(() => {
    let cancelled = false;
    // With at least one spell, "Read" is the first tab and the default; it only exists with
    // spells, so if the last one is deleted while it's showing, fall back to "Text". Both
    // are picked in the same update as the answer, so there's never a frame on a tab that
    // no longer matches (e.g. the Read content still showing with its tab already gone).
    const apply = (exists: boolean) => {
      if (cancelled) return;
      setHasSpells(exists);
      if (exists && !userPickedTab.current) setInputType('read');
      if (!exists) setInputType(prev => (prev === 'read' ? 'text' : prev));
    };
    hasSpellsInDB(userId)
      .then(apply)
      .catch(() => apply(false));
    return () => { cancelled = true; };
  }, [userId, listVersion]);

  const handleInputTypeChange = (type: string) => {
    userPickedTab.current = true;
    setInputType(type);
    dispatch(resetSpellState());
  };

  // A spell dragged anywhere over Start jumps to the Read tab, so it can be dropped without
  // switching tabs by hand. Files dragged in (ImportOption's own dropzone) are left alone.
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setDragActive(true);
    if (inputType !== 'read') setInputType('read');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Only a leave toward somewhere outside Start ends the drag state; moving between Start's
  // own children also fires dragleave. (Not counted enter/leave pairs: switching tabs
  // removes the element the drag entered through, and a removed node never gets its leave.)
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragActive(false);
  };

  // A drag can also end without ever leaving Start (Esc, or dropped somewhere that isn't a
  // target); dragend fires on the dragged card and bubbles up to the document either way.
  useEffect(() => {
    if (!dragActive) return;
    const end = () => setDragActive(false);
    document.addEventListener('dragend', end);
    document.addEventListener('drop', end);
    return () => {
      document.removeEventListener('dragend', end);
      document.removeEventListener('drop', end);
    };
  }, [dragActive]);

  const handleDrop = async (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setDragActive(false);
    const spellId = e.dataTransfer.getData(SPELL_DRAG_TYPE);
    if (!spellId) return;
    try {
      const spell = await getSpellById(spellId, userId);
      if (spell) readSpell(spell);
    } catch (error) {
      console.error('Failed to load dropped spell:', error);
    }
  };

  const getSubtitle = () => {
    switch (inputType) {
      case 'import': return t.start.importSubtitle;
      case 'text':   return t.start.textSubtitle;
      case 'read':   return t.start.readSubtitle;
      default:       return;
    }
  };

  const inputTypeTabs = [
    ...(hasSpells ? [{ id: 'read', label: t.start.readTab, icon: faBookOpen }] : []),
    { id: 'text', label: t.start.textTab, icon: faPen },
    { id: 'import', label: t.start.importTab, icon: faUpload },
  ];

  return (
    <div
      data-testid="start"
      className={s.container}
      onDragEnter={hasSpells ? handleDragEnter : undefined}
      onDragOver={hasSpells ? handleDragOver : undefined}
      onDragLeave={hasSpells ? handleDragLeave : undefined}
      onDrop={hasSpells ? handleDrop : undefined}
    >
      <div className={s.createContainer}>
        <h1 className="featured-glow">{t.start.castSpell}</h1>
        {/* Laid out but invisible until the spells check answers, so the page doesn't shift
            and never flashes a tab it's about to leave. */}
        <div data-testid="start-body" className={`${s.body} ${hasSpellsKnown === null ? s.pending : ''}`}>
          <p>{getSubtitle()}</p>

          <SegmentedTabs tabs={inputTypeTabs} active={inputType} onChange={handleInputTypeChange} />

          <div className={s.optionContainer}>
            {hasSpellsKnown !== null && inputType === 'import' && <ImportOption />}
            {hasSpellsKnown !== null && inputType === 'text' && <TextOption />}
            {inputType === 'read' && <ReadOption dragActive={dragActive} />}
          </div>
        </div>
      </div>
    </div>
  );
};
