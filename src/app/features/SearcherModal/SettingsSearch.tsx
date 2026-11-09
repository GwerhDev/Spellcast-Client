import React, { useState } from 'react';
import s from '../../components/Modals/SearcherModal.module.css';
import { useLanguage } from '../../../i18n';
import { SearchResult } from '../../components/Modals/SearchResult';
import { useSettingsSearch } from './searchSources';

interface SettingsSearchProps {
  onDone: () => void;
  // The player's settings are the layout's to open.
  onOpenPlayerSettings?: () => void;
}

// The app's settings only, by their name, what they're for, or their keywords: one to open.
export const SettingsSearch: React.FC<SettingsSearchProps> = ({ onDone, onOpenPlayerSettings }) => {
  const { t } = useLanguage();
  const { find, open } = useSettingsSearch(onDone, onOpenPlayerSettings);
  const [query, setQuery] = useState('');
  const found = find(query);

  return (
    <div className={s.panel}>
      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          data-testid="settings-search-input"
          placeholder={t.search.settingsPlaceholder}
          className={s.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && found[0]) open(found[0]); }}
        />
      </div>
      {!found.length ? (
        <p data-testid="settings-search-no-results" className={s.hint}>{t.search.noSettings.replace('{query}', query)}</p>
      ) : (
        <ul className={s.pageList}>
          {found.map(entry => (
            <SearchResult
              key={entry.key} testId={`settings-search-${entry.key}`} icon={entry.icon}
              title={entry.label} desc={entry.desc} onClick={() => open(entry)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
