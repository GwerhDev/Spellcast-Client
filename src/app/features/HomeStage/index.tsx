import { useState } from 'react';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { HomeStage as HomeStageView } from '../../components/HomeStage/HomeStage';
import { IconButton } from '../../components/Buttons/IconButton';
import { AltarSettingsModal } from '../../components/Altar/AltarSettingsModal';
import { useLanguage } from '../../../i18n';
import { Start } from '../Start';
import { QuickStart } from '../QuickStart';
import { useAppSelector } from '../../../store/hooks';
import { useSpellCoverUrl } from '../../../hooks/useSpellCoverUrl';
import { usePointerIdle } from '../../../hooks/usePointerIdle';

// How long the pointer rests before the quick start steps aside, with a spell loaded.
export const HOME_IDLE_MS = 3000;

// The home page: Start's altar as the scene, the quick start below it. With a spell loaded, the
// altar is shown immersive (no box of its own, centered, its actions around the center) and
// the quick start fades out while the pointer rests; if the spell has a cover, it becomes the
// whole page's backdrop too -- if the altar's settings say so (see AltarSettingsModal; by
// default nothing is drawn behind it).
export const HomeStage = () => {
  const spellId = useAppSelector(state => state.spellReader.spellId);
  const userId = useAppSelector(state => state.session.userData?.id);
  const coverUrl = useSpellCoverUrl(spellId, userId);
  const backdrop = useAppSelector(state => state.altar.backdrop);
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useLanguage();
  const immersive = !!spellId;
  const idle = usePointerIdle(HOME_IDLE_MS, immersive);

  return (
    <HomeStageView
      coverUrl={backdrop === 'cover' ? coverUrl : null}
      immersive={immersive}
      idle={idle}
      main={<Start immersive={immersive} idle={idle} />}
      secondary={<QuickStart />}
      corner={(
        <>
          <IconButton data-testid="altar-settings-btn" icon={faGear} variant='transparent' title={t.start.altarSettings} onClick={() => setShowSettings(true)} />
          <AltarSettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
        </>
      )}
    />
  );
};
