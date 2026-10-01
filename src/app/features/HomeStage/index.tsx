import { HomeStage as HomeStageView } from '../../components/HomeStage/HomeStage';
import { Start } from '../Start';
import { LastSpells } from '../LastSpells';
import { useAppSelector } from '../../../store/hooks';
import { useSpellCoverUrl } from '../../../hooks/useSpellCoverUrl';
import { usePointerIdle } from '../../../hooks/usePointerIdle';

// How long the pointer rests before Last Spells steps aside, with a spell's cover on stage.
export const HOME_IDLE_MS = 3000;

// The home page: Start's altar as the scene, Last Spells below it. With a spell loaded, the
// altar is shown immersive (no box of its own, centered, its actions around the center) and
// Last Spells fades out while the pointer rests; if the spell has a cover, it becomes the
// whole page's backdrop too.
export const HomeStage = () => {
  const spellId = useAppSelector(state => state.spellReader.spellId);
  const userId = useAppSelector(state => state.session.userData?.id);
  const coverUrl = useSpellCoverUrl(spellId, userId);
  const immersive = !!spellId;
  const idle = usePointerIdle(HOME_IDLE_MS, immersive);

  return (
    <HomeStageView
      coverUrl={coverUrl}
      immersive={immersive}
      idle={idle}
      main={<Start immersive={immersive} idle={idle} />}
      secondary={<LastSpells />}
    />
  );
};
