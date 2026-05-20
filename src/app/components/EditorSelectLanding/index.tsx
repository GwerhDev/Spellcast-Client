import s from './index.module.css';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { faArrowLeft, faCloud, faHardDrive, faLayerGroup, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getDocumentsFromDB } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { Document } from 'src/interfaces';
import { EditorPickerCard } from '../Cards/EditorPickerCard';
import { IconButton } from '../Buttons/IconButton';
import { Spinner } from '../Spinner';
import { FilterTabs } from '../Selectors/FilterTabs';
import { useLanguage } from '../../../i18n';

type EditorFilter = 'all' | 'local' | 'cloud';

export const EditorSelectLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAppSelector((state) => state.session);
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EditorFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getDocumentsFromDB(userData.id)
      .then((docs) =>
        setDocuments(docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      )
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userData.id]);

  const tabs = [
    { id: 'all',   label: t.common.all,  icon: faLayerGroup },
    { id: 'local', label: t.nav.local,   icon: faHardDrive  },
    { id: 'cloud', label: t.nav.cloud,   icon: faCloud      },
  ];

  const handleFilterChange = (id: string) => {
    setFilter(id as EditorFilter);
    setQuery('');
  };

  const q = query.trim().toLowerCase();
  const visible = q ? documents.filter(d => d.title.toLowerCase().includes(q)) : documents;

  const renderBody = () => {
    if (filter === 'cloud') return (
      <div className={s.cloudEmpty}>
        <FontAwesomeIcon icon={faCloud} className={s.cloudIcon} />
        <p>{t.storage.cloudSyncDesc}</p>
      </div>
    );
    if (isLoading) return <Spinner isLoading />;
    if (documents.length === 0) return <p className={s.empty}>{t.document.noLocalDocuments}</p>;
    if (visible.length === 0) return <p className={s.empty}>{t.document.noDocuments}</p>;
    return (
      <div className={s.docGrid}>
        {visible.map((doc) => (
          <EditorPickerCard
            key={doc.id}
            doc={doc}
            onClick={() => navigate(`/editor/${doc.id}`, { state: { from: location.pathname } })}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <IconButton icon={faArrowLeft} variant='transparent' onClick={() => navigate('/editor')} />
        <h2 className={s.panelTitle}>{t.editor.selectDocument}</h2>
      </div>

      <div className={s.controls}>
        <FilterTabs tabs={tabs} active={filter} onChange={handleFilterChange} compact />
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
      </div>

      <div className={s.panelBody}>
        {renderBody()}
      </div>
    </div>
  );
};
