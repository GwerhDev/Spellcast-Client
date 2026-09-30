import s from '../../components/Start/index.module.css';
import { useState } from 'react';
import { WriteOption } from './WriteOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { ImportOption } from './ImportOption';
import { Altar } from './Altar';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useLanguage } from '../../../i18n';

interface StartProps {
  // A spell is loaded and the page shows its cover behind the altar (see HomeStage): the
  // title and subtitle step aside and the altar takes the room, centered.
  immersive?: boolean;
  // The pointer is resting: the altar's immersive actions step aside.
  idle?: boolean;
}

export const Start = ({ immersive = false, idle = false }: StartProps) => {
  // Write and Import open from the Spellcast button's menu (see Altar), as modals.
  const [modal, setModal] = useState<'write' | 'import' | null>(null);
  const dispatch = useDispatch();
  const { t } = useLanguage();

  // Closing Import drops whatever it had pending (a PDF picked but not created yet), as
  // leaving its tab used to.
  const closeModal = () => {
    if (modal === 'import') dispatch(resetSpellState());
    setModal(null);
  };

  return (
    <div data-testid="start" className={`${s.container} ${immersive ? s.immersive : ''}`}>
      <div className={s.createContainer}>
        {!immersive && <h1 className="featured-glow">{t.start.castSpell}</h1>}
        <div data-testid="start-body" className={s.body}>
          {!immersive && <p>{t.start.readSubtitle}</p>}

          <div className={s.optionContainer}>
            <Altar onWrite={() => setModal('write')} onImport={() => setModal('import')} immersive={immersive} idle={idle} />
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
