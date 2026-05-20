import { useState } from 'react';
import s from './index.module.css';
import { useLanguage } from '../../../i18n';
import { FilterTabs } from '../Selectors/FilterTabs';
import { DocumentList, LibraryFilter } from '../DocumentList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faHardDrive, faLayerGroup, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

export const LibraryLanding = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [query, setQuery] = useState('');

  const tabs = [
    { id: 'all',   label: t.common.all,  icon: faLayerGroup },
    { id: 'local', label: t.nav.local,   icon: faHardDrive  },
    { id: 'cloud', label: t.nav.cloud,   icon: faCloud      },
  ];

  const handleFilterChange = (id: string) => {
    setFilter(id as LibraryFilter);
    setQuery('');
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1 className="featured">{t.nav.library}</h1>
        <p>{t.library.subtitle}</p>
      </div>

      <FilterTabs tabs={tabs} active={filter} onChange={handleFilterChange} />

      <div className={s.searchWrapper}>
        <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
        <input
          className={s.searchInput}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.search + '…'}
        />
      </div>

      {filter === 'cloud' ? (
        <div className={s.empty}>
          <FontAwesomeIcon icon={faCloud} className={s.emptyIcon} />
          <p>{t.storage.cloudSyncDesc}</p>
        </div>
      ) : (
        <DocumentList query={query} filter={filter} />
      )}
    </div>
  );
};
