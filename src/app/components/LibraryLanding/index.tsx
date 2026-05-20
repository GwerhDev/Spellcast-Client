import { useState } from 'react';
import s from './index.module.css';
import { useLanguage } from '../../../i18n';
import { FilterTabs } from '../Selectors/FilterTabs';
import { DocumentList } from '../DocumentList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faHardDrive, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

type LibraryFilter = 'all' | 'local' | 'cloud';

export const LibraryLanding = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const tabs = [
    { id: 'all',   label: t.common.all,  icon: faLayerGroup },
    { id: 'local', label: t.nav.local,   icon: faHardDrive  },
    { id: 'cloud', label: t.nav.cloud,   icon: faCloud      },
  ];

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1 className="featured">{t.nav.library}</h1>
        <p>{t.library.subtitle}</p>
      </div>

      <FilterTabs tabs={tabs} active={filter} onChange={(id) => setFilter(id as LibraryFilter)} />

      {filter === 'cloud' ? (
        <div className={s.empty}>
          <FontAwesomeIcon icon={faCloud} className={s.emptyIcon} />
          <p>{t.storage.cloudSyncDesc}</p>
        </div>
      ) : (
        <DocumentList />
      )}
    </div>
  );
};
