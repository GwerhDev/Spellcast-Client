import React, { useState } from 'react';
import s from '../../components/Modals/SearcherModal.module.css';
import { faFileLines, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { SPELL_ICON } from '../../../config/consts';
import { useAppSelector } from '../../../store/hooks';
import { useLanguage } from '../../../i18n';
import { SearchResult } from '../../components/Modals/SearchResult';
import { SearchEmpty } from '../../components/Modals/SearchEmpty';
import { filterSpells, findTextMatches, useGrimoireSpells, useOpenSpell, useSettingsSearch, useSpellPages } from './searchSources';
import { Highlight, useGoToSpellPage } from './SpellContentSearch';
import { spellDesc } from './SpellsSearch';

// How many of each kind it shows: the rest are its own tab's.
const PER_GROUP = 5;

interface GeneralSearchProps {
  onDone: () => void;
  onOpenPlayerSettings?: () => void;
}

// Everything at once: the grimoire's Spells, the open Spell's pages and text, and the settings.
// Nothing is listed until something is looked for: it says what it can find.
export const GeneralSearch: React.FC<GeneralSearchProps> = ({ onDone, onOpenPlayerSettings }) => {
  const { t } = useLanguage();
  const { spellId, spellTitle, totalPages } = useAppSelector(state => state.spellReader);
  const spells = useGrimoireSpells();
  const { fullTexts } = useSpellPages(spellId);
  const settings = useSettingsSearch(onDone, onOpenPlayerSettings);
  const openSpell = useOpenSpell(onDone);
  const goToPage = useGoToSpellPage(onDone);
  const [query, setQuery] = useState('');

  const q = query.trim();
  const foundSpells = q ? filterSpells(spells ?? [], q).slice(0, PER_GROUP) : [];
  const jump = spellId ? parseInt(q, 10) : NaN;
  const canJump = !isNaN(jump) && String(jump) === q && jump >= 1 && jump <= totalPages;
  const foundText = spellId ? findTextMatches(fullTexts, q, 1).slice(0, PER_GROUP) : [];
  const foundSettings = q ? settings.find(q).slice(0, PER_GROUP) : [];
  const nothing = q && !foundSpells.length && !canJump && !foundText.length && !foundSettings.length;

  const first = () => {
    if (canJump) return goToPage(jump);
    if (foundSpells[0]) return openSpell(foundSpells[0]);
    if (foundText[0]) return goToPage(foundText[0].page);
    if (foundSettings[0]) return settings.open(foundSettings[0]);
  };

  return (
    <div className={s.panel}>
      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          data-testid="general-search-input"
          placeholder={t.search.everythingPlaceholder}
          className={s.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') first(); }}
        />
      </div>

      {!q ? (
        <SearchEmpty icon={faMagnifyingGlass} testId="general-search-hint">
          {spellId ? t.search.everythingHintWithSpell.replace('{title}', spellTitle ?? '') : t.search.everythingHint}
        </SearchEmpty>
      ) : nothing ? (
        <SearchEmpty icon={faMagnifyingGlass} testId="general-search-no-results">{t.search.nothingFound.replace('{query}', q)}</SearchEmpty>
      ) : (
        <div className={s.groups}>
          {foundSpells.length > 0 && (
            <section data-testid="general-search-spells">
              <h4 className={s.groupTitle}>{t.search.spellsGroup}</h4>
              <ul className={s.pageList}>
                {foundSpells.map(spell => (
                  <SearchResult
                    key={spell.id} testId={`general-search-spell-${spell.id}`} icon={SPELL_ICON} title={spell.title}
                    desc={spellDesc(spell, t.search.pages)} onClick={() => openSpell(spell)}
                  />
                ))}
              </ul>
            </section>
          )}
          {(canJump || foundText.length > 0) && (
            <section data-testid="general-search-spell-content">
              <h4 className={s.groupTitle}>{t.search.inSpell.replace('{title}', spellTitle ?? '')}</h4>
              <ul className={s.pageList}>
                {canJump && (
                  <SearchResult
                    testId="general-search-jump" icon={faFileLines}
                    title={`${t.reader.goTo} ${jump}`} onClick={() => goToPage(jump)}
                  />
                )}
                {foundText.map((match, i) => (
                  <li key={i} data-testid="general-search-match" className={s.pageOption} onClick={() => goToPage(match.page)}>
                    <span className={s.pageNumber}>{match.page}</span>
                    <span className={s.snippetWrap}><Highlight text={match.context} start={match.matchStart} end={match.matchEnd} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {foundSettings.length > 0 && (
            <section data-testid="general-search-settings">
              <h4 className={s.groupTitle}>{t.search.settings}</h4>
              <ul className={s.pageList}>
                {foundSettings.map(entry => (
                  <SearchResult
                    key={entry.key} testId={`general-search-setting-${entry.key}`} icon={entry.icon}
                    title={entry.label} desc={entry.desc} onClick={() => settings.open(entry)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
