import s from '../../components/Start/index.module.css';
import { useEffect, useState } from 'react';
import { WriteOption } from './WriteOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { ImportOption } from './ImportOption';
import { ReadOption } from './ReadOption';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById } from '../../../db';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { useLanguage } from '../../../i18n';

const isSpellDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(SPELL_DRAG_TYPE);

export const Start = () => {
  const [dragActive, setDragActive] = useState(false);
  // Write and Import open from the Spellcast button's menu (see ReadOption), as modals.
  const [modal, setModal] = useState<'write' | 'import' | null>(null);
  const dispatch = useDispatch();
  const userId = useAppSelector(state => state.session.userData?.id);
  const { readSpell } = usePlaySpell();
  const { t } = useLanguage();

  // Closing Import drops whatever it had pending (a PDF picked but not created yet), as
  // leaving its tab used to.
  const closeModal = () => {
    if (modal === 'import') dispatch(resetSpellState());
    setModal(null);
  };

  // A spell dragged anywhere over Start lights up the Read control, so it can be dropped
  // anywhere on the section. Files dragged in are left to ReadOption's own .spell drop.
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Only a leave toward somewhere outside Start ends the drag state; moving between Start's
  // own children also fires dragleave. (Not counted enter/leave pairs: an element the drag
  // entered through can be removed mid-drag, and a removed node never gets its leave.)
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
          <p>{t.start.readSubtitle}</p>

          <div className={s.optionContainer}>
            <ReadOption dragActive={dragActive} onWrite={() => setModal('write')} onImport={() => setModal('import')} />
          </div>
        </div>
      </div>
      <CustomModal show={modal === 'write'} title={t.start.writeTab} onClose={closeModal} compact>
        <div data-testid="start-write-modal" className={s.modalBody}>
          <WriteOption />
        </div>
      </CustomModal>
      <CustomModal show={modal === 'import'} title={t.start.importTab} onClose={closeModal} compact>
        <div data-testid="start-import-modal" className={s.modalBody}>
          <ImportOption />
        </div>
      </CustomModal>
    </div>
  );
};
