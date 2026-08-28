import { useState } from 'react';
import s from './index.module.css';
import { useLanguage } from '../../../i18n';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { SpellList, GrimoireFilter } from '../SpellList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faHardDrive, faLayerGroup, faMagnifyingGlass, faPlus, faCheckSquare, faTrash, faXmark, faBuildingColumns, faArrowsRotate, faCheckDouble, faSquare } from '@fortawesome/free-solid-svg-icons';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from '../../components/EmptyState';
import { ImportOption } from '../../components/Start/ImportOption';
import { CustomModal } from '../../components/Modals/CustomModal';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { SecondaryButton } from '../../components/Buttons/SecondaryButton';
import { deleteSpellFromDB } from '../../../db';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { invalidateSpellList } from '../../../store/spellReaderSlice';
import { useRefreshSpellMetadataFromPdf } from '../../../hooks/useRefreshSpellMetadataFromPdf';

export const GrimoireLanding = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector(state => state.session);
  const [filter, setFilter] = useState<GrimoireFilter>('all');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectableIds, setSelectableIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkRefreshMetadataModal, setShowBulkRefreshMetadataModal] = useState(false);
  const { refreshMany, isRefreshing } = useRefreshSpellMetadataFromPdf();

  const tabs = [
    { id: 'all',   label: t.common.all,  icon: faLayerGroup },
    { id: 'local', label: t.nav.local,   icon: faHardDrive  },
    { id: 'cloud', label: t.nav.cloud,   icon: faCloud      },
  ];

  const handleFilterChange = (id: string) => {
    setFilter(id as GrimoireFilter);
    setQuery('');
    // Switching tabs abandons whatever selection was in progress -- the list backing it
    // (and the actions toolbar that would let you cancel selection mode) may no longer
    // even be visible on the new tab (e.g. Cloud).
    setSelectionMode(false);
    setSelectedIds([]);
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

  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : selectableIds);

  const handleBulkDeleteConfirm = async () => {
    if (!userData?.id) return;
    await Promise.all(selectedIds.map(id => deleteSpellFromDB(id, userData.id)));
    dispatch(invalidateSpellList());
    setSelectedIds([]);
    setSelectionMode(false);
    setShowBulkDeleteModal(false);
  };

  const handleBulkRefreshMetadataConfirm = async () => {
    setShowBulkRefreshMetadataModal(false);
    await refreshMany(selectedIds);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  return (
    <div className={s.container} data-testid="grimoire-landing">
      <SectionHeader icon={faBuildingColumns} title={t.nav.grimoire} subtitle={t.grimoire.subtitle} align="center" />

      <SegmentedTabs tabs={tabs} active={filter} onChange={handleFilterChange} />

      <CustomModal show={showImport} onClose={() => setShowImport(false)} title={t.grimoire.addSpells} compact>
        <ImportOption />
      </CustomModal>

      <div className={s.searchWrapper}>
        <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
        <input
          data-testid="grimoire-search"
          className={s.searchInput}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.search + '…'}
        />
      </div>

      <div className={s.actionsRow}>
        <button
          data-testid="add-spells-btn"
          className={`${s.toolbarBtn} ${showImport ? s.toolbarBtnActive : ''}`}
          onClick={() => { setShowImport(v => !v); if (selectionMode) toggleSelectionMode(); }}
          title={t.grimoire.addSpells}
        >
          <FontAwesomeIcon icon={faPlus} />
          {t.grimoire.addSpells}
        </button>
        <button
          data-testid="select-mode-btn"
          className={`${s.toolbarBtn} ${selectionMode ? s.toolbarBtnActive : ''}`}
          onClick={toggleSelectionMode}
          title={selectionMode ? t.grimoire.cancelSelection : t.grimoire.selectMode}
        >
          <FontAwesomeIcon icon={selectionMode ? faXmark : faCheckSquare} />
          {selectionMode ? t.grimoire.cancelSelection : t.grimoire.selectMode}
        </button>
      </div>

      {filter === 'cloud' ? (
        <EmptyState testId="grimoire-cloud-empty" icon={faCloud} message={t.storage.cloudSyncDesc} />
      ) : (
        <SpellList
          query={query}
          filter={filter}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectableIdsChange={setSelectableIds}
        />
      )}

      {selectionMode && (
        <div className={s.bulkBar} data-testid="bulk-bar">
          <span data-testid="bulk-count" className={s.bulkCount}>
            {t.grimoire.nSelected.replace('{n}', String(selectedIds.length))}
          </span>
          <button
            data-testid="select-all-btn"
            className={`${s.selectAllBtn} ${allSelected ? s.selectAllBtnActive : ''}`}
            disabled={selectableIds.length === 0}
            onClick={toggleSelectAll}
          >
            <FontAwesomeIcon icon={allSelected ? faSquare : faCheckDouble} />
            {allSelected ? t.grimoire.unselectAll : t.grimoire.selectAll}
          </button>
          <button
            data-testid="bulk-refresh-metadata-btn"
            className={`${s.bulkActionBtn} ${s.bulkRefreshBtn}`}
            disabled={isRefreshing || selectedIds.length === 0}
            onClick={() => setShowBulkRefreshMetadataModal(true)}
          >
            <FontAwesomeIcon icon={faArrowsRotate} />
            {t.grimoire.bulkRefreshMetadata}
          </button>
          <button
            data-testid="bulk-delete-btn"
            className={`${s.bulkActionBtn} ${s.bulkDeleteBtn}`}
            disabled={selectedIds.length === 0}
            onClick={() => setShowBulkDeleteModal(true)}
          >
            <FontAwesomeIcon icon={faTrash} />
            {t.grimoire.deleteSelected}
          </button>
        </div>
      )}

      {showBulkDeleteModal && (
        <DeleteConfirmModal
          show={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={t.spell.deleteTitle}
          message={t.grimoire.deleteSelectedConfirm.replace('{n}', String(selectedIds.length))}
        />
      )}

      <CustomModal compact show={showBulkRefreshMetadataModal} onClose={() => setShowBulkRefreshMetadataModal(false)} title={t.grimoire.bulkRefreshMetadataConfirmTitle}>
        <div className={s.bulkModalBody}>
          <p>{t.grimoire.bulkRefreshMetadataConfirmDesc}</p>
          <div className={s.bulkModalActions}>
            <SecondaryButton onClick={() => setShowBulkRefreshMetadataModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton data-testid="bulk-refresh-metadata-confirm-btn" onClick={handleBulkRefreshMetadataConfirm}>
              {t.grimoire.bulkRefreshMetadata}
            </PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
