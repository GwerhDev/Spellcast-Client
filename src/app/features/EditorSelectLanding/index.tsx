import s from '../../components/EditorSelectLanding/index.module.css';
import grid from '../../components/SpellGrid/index.module.css';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { faArrowLeft, faScroll, faCloud, faFeatherPointed, faHardDrive, faLayerGroup, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getSpellsFromDB } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { Spell } from '../../../interfaces';
import { EditorPickerCard } from '../../components/Cards/EditorPickerCard';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { SectionHeader } from '../../components/SectionHeader';
import { IconButton } from '../../components/Buttons/IconButton';
import { EmptyState } from '../../components/EmptyState';
import { useLanguage } from '../../../i18n';
import { useInfiniteList } from '../../../hooks/useInfiniteList';

type EditorFilter = 'all' | 'local' | 'cloud';

export const EditorSelectLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAppSelector((state) => state.session);
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<Spell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EditorFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getSpellsFromDB(userData.id)
      .then((docs) =>
        setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
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
  const filtered = q ? documents.filter(d => d.title.toLowerCase().includes(q)) : documents;
  const { visible, hasMore, sentinelRef } = useInfiniteList(filtered);

  const renderBody = () => {
    if (filter === 'cloud') return (
      <EmptyState testId="editor-select-cloud-empty" icon={faCloud} message={t.storage.cloudSyncDesc} />
    );
    if (isLoading) return (
      <div className={grid.grid}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={grid.skeletonCard} data-testid="editor-select-skeleton-card">
            <div className={`${grid.skeletonCover} ${grid.skeletonLine}`} />
            <div className={grid.skeletonFooter}>
              <div className={`${grid.skeletonLine} ${grid.skeletonTitle}`} />
              <div className={`${grid.skeletonLine} ${grid.skeletonTitleShort}`} />
              <div className={`${grid.skeletonLine} ${grid.skeletonDate}`} />
            </div>
          </div>
        ))}
      </div>
    );
    if (documents.length === 0) return (
      <EmptyState
        testId="editor-select-empty"
        icon={faScroll}
        message={filter === 'local' ? t.spell.noLocalSpells : t.spell.noSpells}
      />
    );
    if (filtered.length === 0) return <EmptyState testId="editor-select-no-results" icon={faMagnifyingGlass} message={t.spell.noSpells} />;
    return (
      <div className={grid.grid}>
        {visible.map((doc) => (
          <EditorPickerCard
            key={doc.id}
            doc={doc}
            onClick={() => navigate(`/editor/${doc.id}`, { state: { from: location.pathname } })}
          />
        ))}
        {hasMore && <div ref={sentinelRef} data-testid="editor-select-sentinel" className={grid.sentinel} />}
      </div>
    );
  };

  return (
    <div data-testid="editor-select" className={s.panel}>
      <div className={s.panelHeader}>
        <IconButton icon={faArrowLeft} variant="transparent" onClick={() => navigate('/editor')} title={t.common.back} />
      </div>

      <div className={s.sectionHeader}>
        <SectionHeader icon={faFeatherPointed} title={t.editor.tagline} subtitle={t.editor.selectSpellSubtitle} align="center" />
      </div>

      <div className={s.controls}>
        <SegmentedTabs tabs={tabs} active={filter} onChange={handleFilterChange} compact />
        <div className={s.searchWrapper}>
          <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
          <input
            data-testid="editor-select-search"
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
