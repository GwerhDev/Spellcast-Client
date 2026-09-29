import s from '../../components/Start/index.module.css';
import { useEffect, useState } from 'react';
import { WriteOption } from './WriteOption';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { ImportOption } from './ImportOption';
import { ReadOption } from './ReadOption';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById } from '../../../db';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { useLanguage } from '../../../i18n';
import { faBookOpen, faPen, faUpload } from '@fortawesome/free-solid-svg-icons';

const isSpellDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(SPELL_DRAG_TYPE);

export const Start = () => {
  // Read is always the first tab and the default: it both reads what's already in the
  // grimoire (drag a spell) and opens .spell files from the computer.
  const [inputType, setInputType] = useState('read');
  const [dragActive, setDragActive] = useState(false);
  const dispatch = useDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const { readSpell } = usePlaySpell();
  const { t } = useLanguage();

  const handleInputTypeChange = (type: string) => {
    setInputType(type);
    dispatch(resetSpellState());
  };

  // A spell dragged anywhere over Start jumps to the Read tab, so it can be dropped without
  // switching tabs by hand. Files dragged in are left to the tab showing (Import's dropzone,
  // or Read's own .spell file drop).
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
      case 'write':  return t.start.writeSubtitle;
      case 'read':   return t.start.readSubtitle;
      default:       return;
    }
  };

  const inputTypeTabs = [
    { id: 'read', label: t.start.readTab, icon: faBookOpen },
    { id: 'write', label: t.start.writeTab, icon: faPen },
    { id: 'import', label: t.start.importTab, icon: faUpload },
  ];

  return (
    <div
      data-testid="start"
      className={s.container}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={s.createContainer}>
        <h1 className="featured-glow">{t.start.castSpell}</h1>
        <div data-testid="start-body" className={s.body}>
          <p>{getSubtitle()}</p>

          <SegmentedTabs tabs={inputTypeTabs} active={inputType} onChange={handleInputTypeChange} />

          <div className={s.optionContainer}>
            {inputType === 'import' && <ImportOption />}
            {inputType === 'write' && <WriteOption />}
            {inputType === 'read' && <ReadOption dragActive={dragActive} />}
          </div>
        </div>
      </div>
    </div>
  );
};
