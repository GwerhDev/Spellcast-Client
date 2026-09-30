import { useEffect, useState, type ReactNode } from 'react';
import { PlayerDock as PlayerDockView } from '../../components/PlayerDock/PlayerDock';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById } from '../../../db';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { useSpellDrag } from '../../../hooks/useSpellDrag';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { useLanguage } from '../../../i18n';

interface PlayerDockProps {
  // The player, when a spell is loaded.
  children?: ReactNode;
}

const isSpellDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(SPELL_DRAG_TYPE);

// The player's bar as a drop target for spells, reading them like the altar does: a spell
// dropped here starts playing (the loaded one keeps playing, or resumes if paused). With
// nothing loaded, the bar appears as an empty slot while a spell is dragged near the bottom
// of the window; with a spell loaded, dropping another one on the player switches to it.
export const PlayerDock = ({ children }: PlayerDockProps) => {
  const { t } = useLanguage();
  const drag = useSpellDrag();
  const [over, setOver] = useState(false);
  const userId = useAppSelector(state => state.session.userData?.id);
  const { readSpell } = usePlaySpell();

  // The drag ended somewhere else (or was cancelled) while over the dock.
  useEffect(() => { if (!drag.active) setOver(false); }, [drag.active]);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!over) setOver(true);
  };

  // Only a leave toward somewhere outside the dock counts; moving between the player's own
  // controls also fires dragleave.
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isSpellDrag(e)) return;
    e.preventDefault();
    setOver(false);
    const droppedId = e.dataTransfer.getData(SPELL_DRAG_TYPE);
    if (!droppedId) return;
    try {
      const spell = await getSpellById(droppedId, userId);
      if (spell) readSpell(spell);
    } catch (error) {
      console.error('Failed to load dropped spell:', error);
    }
  };

  return (
    <PlayerDockView
      showEmpty={drag.active && (drag.nearBottom || over)}
      highlighted={drag.active && over}
      hint={children ? t.player.dropToSwitch : t.player.dropToLoad}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </PlayerDockView>
  );
};
