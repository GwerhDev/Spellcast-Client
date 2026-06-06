import { useState } from 'react';
import s from './index.module.css';
import { useLanguage } from '../../../i18n';
import { FilterTabs } from '../../components/Selectors/FilterTabs';
import { DocumentList, LibraryFilter, LibraryDocFilter } from '../DocumentList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faHardDrive, faLayerGroup, faMagnifyingGlass, faPlus, faCheckSquare, faTrash, faXmark, faBuildingColumns, faBookOpen, faFilePdf, faBan } from '@fortawesome/free-solid-svg-icons';
import { SectionHeader } from '../../components/SectionHeader';
import { ImportOption } from '../../components/Start/ImportOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { deleteDocumentFromDB } from '../../../db';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { invalidateDocumentList } from '../../../store/pdfReaderSlice';

export const LibraryLanding = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector(state => state.session);
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [docFilter, setDocFilter] = useState<LibraryDocFilter>('all');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const tabs = [
    { id: 'all',   label: t.common.all,  icon: faLayerGroup },
    { id: 'local', label: t.nav.local,   icon: faHardDrive  },
    { id: 'cloud', label: t.nav.cloud,   icon: faCloud      },
  ];

  const handleFilterChange = (id: string) => {
    setFilter(id as LibraryFilter);
    setQuery('');
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds([]);
    } else {
      setShowImport(false);
      setSelectionMode(true);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteConfirm = async () => {
    if (!userData?.id) return;
    await Promise.all(selectedIds.map(id => deleteDocumentFromDB(id, userData.id)));
    dispatch(invalidateDocumentList());
    setSelectedIds([]);
    setSelectionMode(false);
    setShowBulkDeleteModal(false);
  };

  return (
    <div className={s.container} data-testid="library-landing">
      <SectionHeader icon={faBuildingColumns} title={t.nav.library} subtitle={t.library.subtitle} align="center" />

      <FilterTabs tabs={tabs} active={filter} onChange={handleFilterChange} />

      <CustomModal show={showImport} onClose={() => setShowImport(false)} title={t.library.addDocuments} compact>
        <ImportOption />
      </CustomModal>

      <div className={s.docFilterBar}>
        {([
          { id: 'all',         label: t.common.all,        icon: faLayerGroup },
          { id: 'reading',     label: t.document.reading,  icon: faBookOpen   },
          { id: 'pdf',         label: 'PDF',               icon: faFilePdf    },
          { id: 'unprocessed', label: 'Unprocessed', icon: faBan },
        ] as { id: LibraryDocFilter; label: string; icon: typeof faLayerGroup }[]).map(chip => (
          <button
            key={chip.id}
            className={`${s.filterChip} ${docFilter === chip.id ? s.filterChipActive : ''}`}
            onClick={() => setDocFilter(chip.id)}
          >
            <FontAwesomeIcon icon={chip.icon} />
            {chip.label}
          </button>
        ))}
      </div>

      <div className={s.searchWrapper}>
        <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
        <input
          data-testid="library-search"
          className={s.searchInput}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.search + '…'}
        />
      </div>

      <div className={s.actionsRow}>
        <button
          data-testid="add-documents-btn"
          className={`${s.toolbarBtn} ${showImport ? s.toolbarBtnActive : ''}`}
          onClick={() => { setShowImport(v => !v); if (selectionMode) toggleSelectionMode(); }}
          title={t.library.addDocuments}
        >
          <FontAwesomeIcon icon={faPlus} />
          {t.library.addDocuments}
        </button>
        <button
          data-testid="select-mode-btn"
          className={`${s.toolbarBtn} ${selectionMode ? s.toolbarBtnActive : ''}`}
          onClick={toggleSelectionMode}
          title={selectionMode ? t.library.cancelSelection : t.library.selectMode}
        >
          <FontAwesomeIcon icon={selectionMode ? faXmark : faCheckSquare} />
          {selectionMode ? t.library.cancelSelection : t.library.selectMode}
        </button>
      </div>

      {filter === 'cloud' ? (
        <div className={s.empty}>
          <FontAwesomeIcon icon={faCloud} className={s.emptyIcon} />
          <p>{t.storage.cloudSyncDesc}</p>
        </div>
      ) : (
        <DocumentList
          query={query}
          filter={filter}
          docFilter={docFilter}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {selectionMode && selectedIds.length > 0 && (
        <div className={s.bulkBar} data-testid="bulk-bar">
          <span className={s.bulkCount}>
            {t.library.nSelected.replace('{n}', String(selectedIds.length))}
          </span>
          <button data-testid="bulk-delete-btn" className={s.bulkDeleteBtn} onClick={() => setShowBulkDeleteModal(true)}>
            <FontAwesomeIcon icon={faTrash} />
            {t.library.deleteSelected}
          </button>
        </div>
      )}

      {showBulkDeleteModal && (
        <DeleteConfirmModal
          show={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={t.document.deleteTitle}
          message={t.library.deleteSelectedConfirm.replace('{n}', String(selectedIds.length))}
        />
      )}
    </div>
  );
};
