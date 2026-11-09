import React, { useState } from 'react';
import s from '../../components/Modals/SearcherModal.module.css';
import { faScroll } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
import type { Spell } from '../../../interfaces';
import { SearchResult } from '../../components/Modals/SearchResult';
import { SearchEmpty } from '../../components/Modals/SearchEmpty';
import { GRIMOIRE_ICON } from '../../../config/consts';
import { filterSpells, useGrimoireSpells, useOpenSpell } from './searchSources';

/** What a Spell is, under its title: its author and how many pages it has. */
export const spellDesc = (spell: Spell, pagesText: string) =>
  [spell.author, spell.listedPages?.count ? pagesText.replace('{n}', String(spell.listedPages.count)) : null].filter(Boolean).join(' · ');

interface SpellsSearchProps {
  onDone: () => void;
}

// The grimoire's Spells only, by their title, author or tags: one to open.
export const SpellsSearch: React.FC<SpellsSearchProps> = ({ onDone }) => {
  const { t } = useLanguage();
  const spells = useGrimoireSpells();
  const open = useOpenSpell(onDone);
  const [query, setQuery] = useState('');
  const found = filterSpells(spells ?? [], query);

  return (
    <div className={s.panel}>
      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          data-testid="spells-search-input"
          placeholder={t.search.spellsPlaceholder}
          className={s.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && found[0]) open(found[0]); }}
        />
      </div>
      {spells && !spells.length ? (
        <SearchEmpty icon={GRIMOIRE_ICON} testId="spells-search-empty">{t.search.emptyGrimoire}</SearchEmpty>
      ) : spells && !found.length ? (
        <SearchEmpty icon={GRIMOIRE_ICON} testId="spells-search-no-results">{t.search.noSpells.replace('{query}', query)}</SearchEmpty>
      ) : (
        <ul className={s.pageList}>
          {found.map(spell => (
            <SearchResult
              key={spell.id} testId={`spells-search-${spell.id}`} icon={faScroll} title={spell.title}
              desc={spellDesc(spell, t.search.pages)} onClick={() => open(spell)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
