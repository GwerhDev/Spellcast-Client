import s from '../../components/Start/index.module.css';
import { useState } from 'react';
import { WriteOption } from './WriteOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { ImportOption } from './ImportOption';
import { Altar } from './Altar';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useLanguage } from '../../../i18n';

export const Start = () => {
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
    <div data-testid="start" className={s.container}>
      <div className={s.createContainer}>
        <h1 className="featured-glow">{t.start.castSpell}</h1>
        <div data-testid="start-body" className={s.body}>
          <p>{t.start.readSubtitle}</p>

          <div className={s.optionContainer}>
            <Altar onWrite={() => setModal('write')} onImport={() => setModal('import')} />
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
