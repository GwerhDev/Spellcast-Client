import s from '../../components/Start/index.module.css';
import { useEffect, useRef, useState } from 'react';
import { TextOption } from './TextOption';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { ImportOption } from './ImportOption';
import { ReadOption } from './ReadOption';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById, getSpellsFromDB } from '../../../db';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { useLanguage } from '../../../i18n';
import { faBookOpen, faPen, faUpload } from '@fortawesome/free-solid-svg-icons';

const isSpellDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(SPELL_DRAG_TYPE);

export const Start = () => {
  const [inputType, setInputType] = useState('text');
  const [hasSpells, setHasSpells] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // dragenter/dragleave fire for every child element crossed; counting them is what tells
  // "left the section" apart from "moved onto a child".
  const dragDepth = useRef(0);
  // Once the user picks a tab, the default-tab logic below stops overriding their choice.
  const userPickedTab = useRef(false);
  const dispatch = useDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const listVersion = useAppSelector(state => state.spellReader.listVersion);
  const { playSpell } = usePlaySpell();
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    getSpellsFromDB(userId)
      .then(spells => { if (!cancelled) setHasSpells(spells.length > 0); })
      .catch(() => { if (!cancelled) setHasSpells(false); });
    return () => { cancelled = true; };
  }, [userId, listVersion]);

  // With at least one spell, "Read" is the first tab and the default; it only exists with
  // spells, so if the last one is deleted while it's showing, fall back to "Text".
  useEffect(() => {
    if (hasSpells && !userPickedTab.current) setInputType('read');
    if (!hasSpells && inputType === 'read') setInputType('text');
  }, [hasSpells, inputType]);

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
    dragDepth.current += 1;
    setDragActive(true);
    if (inputType !== 'read') setInputType('read');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const spellId = e.dataTransfer.getData(SPELL_DRAG_TYPE);
    if (!spellId) return;
    try {
      const spell = await getSpellById(spellId, userId);
      if (spell) playSpell(spell);
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
        <p>{getSubtitle()}</p>

        <SegmentedTabs tabs={inputTypeTabs} active={inputType} onChange={handleInputTypeChange} />

        <div className={s.optionContainer}>
          {inputType === 'import' && <ImportOption />}
          {inputType === 'text' && <TextOption />}
          {inputType === 'read' && <ReadOption dragActive={dragActive} />}
        </div>
      </div>
    </div>
  );
};
