import s from '../../components/Start/index.module.css';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WriteOption } from './WriteOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { ImportOption } from './ImportOption';
import { Altar } from './Altar';
import { useLanguage } from '../../../i18n';

interface StartProps {
  // A spell is loaded and the page shows its cover behind the altar (see HomeStage): the
  // title and subtitle step aside and the altar takes the room, centered.
  immersive?: boolean;
  // The pointer is resting: the altar's immersive actions step aside.
  idle?: boolean;
}

// Title and subtitle folding away as the altar goes immersive, and back when it doesn't.
const fold = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.4, ease: 'easeInOut' },
  style: { overflow: 'hidden' },
} as const;

export const Start = ({ immersive = false, idle = false }: StartProps) => {
  // Write and Import open from the Spellcast button's menu (see Altar), as modals.
  const [modal, setModal] = useState<'write' | 'import' | null>(null);
  const { t } = useLanguage();

  // Closing Import drops whatever it had pending: ImportOption clears it as it unmounts.
  const closeModal = () => setModal(null);

  return (
    <div data-testid="start" className={`${s.container} ${immersive ? s.immersive : ''}`}>
      <div className={s.createContainer}>
        {/* Folding away (and back) instead of vanishing, so the altar glides into place. */}
        <AnimatePresence initial={false}>
          {!immersive && (
            <motion.div key="title" {...fold}>
              <h1 className="featured-glow">{t.start.castSpell}</h1>
            </motion.div>
          )}
        </AnimatePresence>
        <div data-testid="start-body" className={s.body}>
          <AnimatePresence initial={false}>
            {!immersive && (
              <motion.div key="subtitle" {...fold}>
                <p>{t.start.readSubtitle}</p>
              </motion.div>
            )}
          </AnimatePresence>

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
