import React from 'react';
import { faGear, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { GRIMOIRE_ICON } from '../../../config/consts';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setShowSearcher } from '../../../store/spellReaderSlice';
import { TabModal, TabDef } from '../../components/Modals/TabModal';
import { CustomModal } from '../../components/Modals/CustomModal';
import { useLanguage } from '../../../i18n';
import { GeneralSearch } from './GeneralSearch';
import { SpellContentSearch } from './SpellContentSearch';
import { SpellsSearch } from './SpellsSearch';
import { SettingsSearch } from './SettingsSearch';
import { CurrentSpellTabIcon } from './CurrentSpellTabIcon';

interface SearcherModalProps {
  // The player's settings are the layout's to open (from the settings' search).
  onOpenPlayerSettings?: () => void;
}

// The app's search, opened from the header: everything at once, and a tab for each kind of
// thing alone (the open Spell's pages, the grimoire, the settings). From the reader, the open
// Spell's pages and text alone.
export const SearcherModal: React.FC<SearcherModalProps> = ({ onOpenPlayerSettings }) => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { showSearcher, searcherScope, spellId, spellTitle } = useAppSelector(state => state.spellReader);
  const close = () => dispatch(setShowSearcher(false));

  const tabs: TabDef[] = [
    { id: 'all', icon: faMagnifyingGlass, label: t.search.everything, content: <GeneralSearch onDone={close} onOpenPlayerSettings={onOpenPlayerSettings} /> },
    ...(spellId ? [{ id: 'spell', iconNode: <CurrentSpellTabIcon />, label: spellTitle ?? t.search.currentSpell, content: <SpellContentSearch onDone={close} /> }] : []),
    { id: 'grimoire', icon: GRIMOIRE_ICON, label: t.search.grimoire, content: <SpellsSearch onDone={close} /> },
    { id: 'settings', icon: faGear, label: t.search.settings, content: <SettingsSearch onDone={close} onOpenPlayerSettings={onOpenPlayerSettings} /> },
  ];

  if (searcherScope === 'spell' && spellId) {
    return (
      <CustomModal show={showSearcher} onClose={close} title={t.reader.selectPage}>
        <SpellContentSearch onDone={close} />
      </CustomModal>
    );
  }
  return <TabModal show={showSearcher} onClose={close} title={t.search.title} tabs={tabs} />;
};
