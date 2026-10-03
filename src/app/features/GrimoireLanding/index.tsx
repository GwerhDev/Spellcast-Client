import { useEffect, useRef, useState } from 'react';
import { clickItem, boxSelect, emptySelection, type ListSelection, type SelectionModifiers } from '../../../utils/listSelection';
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
import { useDeleteSpells } from '../../../hooks/useDeleteSpells';
import { useAppSelector } from '../../../store/hooks';
import { useUpdateSpellsFromPdf } from '../../../hooks/useUpdateSpellsFromPdf';

export const GrimoireLanding = () => {
  const { t } = useLanguage();
  const deleteSpells = useDeleteSpells();
  const { userData } = useAppSelector(state => state.session);
  const [filter, setFilter] = useState<GrimoireFilter>('all');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  // Selecting spells as in a file manager (see listSelection): the "Select" button turns it
  // on (a click picks instead of opening -- the way on touch), and so does any spell picked
  // with Ctrl/⌘+click, Shift+click or a box dragged across the list. It stays on while
  // anything is selected.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<ListSelection>(emptySelection);
  const selectedIds = selection.selected;
  const selectionActive = selectionMode || selectedIds.length > 0;
  // The spells matching the search and tab, in the grid's order: what a Shift+click's run
  // and a box follow.
  const [selectableIds, setSelectableIds] = useState<string[]>([]);
  // What was selected when a box started with Ctrl/Shift held: the box adds to it.
  const boxBaseRef = useRef<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showUpdateFromPdfModal, setShowUpdateFromPdfModal] = useState(false);
  const [isQueueingUpdate, setIsQueueingUpdate] = useState(false);
  const updateFromPdf = useUpdateSpellsFromPdf();

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
    setSelection(emptySelection);
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelection(emptySelection);
  };

  const toggleSelectionMode = () => {
    if (selectionActive) {
      clearSelection();
    } else {
      setShowImport(false);
      setSelectionMode(true);
    }
  };

  // A plain click while selecting: that spell in or out.
  const toggleSelect = (id: string) => {
    setSelection(prev => clickItem(prev, selectableIds, id, { toggle: false, range: false }));
  };

  // Ctrl/⌘+click and Shift+click, selecting or not yet.
  const handleItemModifiedClick = (id: string, modifiers: SelectionModifiers) => {
    setShowImport(false);
    setSelection(prev => clickItem(prev, selectableIds, id, modifiers));
  };

  const handleBoxStart = (additive: boolean) => {
    setShowImport(false);
    boxBaseRef.current = additive ? selectedIds : [];
  };
  const handleBoxChange = (hit: string[]) => {
    setSelection(prev => ({ ...prev, selected: boxSelect(boxBaseRef.current, hit, selectableIds) }));
  };
  // A click on the list's empty space lets go of the selection (not with Ctrl/Shift held,
  // as a file manager does), leaving the "Select" mode on if it was turned on by hand.
  const handleEmptyClick = (additive: boolean) => {
    if (!additive) setSelection(emptySelection);
  };

  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;
  const toggleSelectAll = () => setSelection({ selected: allSelected ? [] : selectableIds, anchor: null });

  // The keyboard's own: Escape lets go of the selection, Ctrl/⌘+A selects every spell shown,
  // Delete (⌘+Backspace on a Mac, as in Finder) asks to delete what's selected -- the same
  // confirmation as the bar's button. Not while typing (the search field's Ctrl+A selects
  // its text), and not while a modal is open (it has the keyboard then).
  const keyState = useRef({ selectionActive, selectableIds, filter, selectedCount: selectedIds.length });
  keyState.current = { selectionActive, selectableIds, filter, selectedCount: selectedIds.length };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      const { selectionActive: active, selectableIds: ids, filter: tab, selectedCount } = keyState.current;
      if (e.key === 'Escape' && active) {
        clearSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && tab !== 'cloud' && ids.length > 0) {
        e.preventDefault();
        setSelection({ selected: ids, anchor: null });
      } else if ((e.key === 'Delete' || (e.metaKey && e.key === 'Backspace')) && selectedCount > 0) {
        e.preventDefault();
        setShowBulkDeleteModal(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleBulkDeleteConfirm = async () => {
    if (!userData?.id) return;
    // Unloads the spell in the player too, if it's among them.
    await deleteSpells(selectedIds);
    setSelection(emptySelection);
    setSelectionMode(false);
    setShowBulkDeleteModal(false);
  };

  // Each spell is read again from its PDF in the background (see useUpdateSpellsFromPdf):
  // the selection closes as soon as they're queued, with their cards showing the progress.
  const handleUpdateFromPdfConfirm = async () => {
    setShowUpdateFromPdfModal(false);
    setIsQueueingUpdate(true);
    try {
      await updateFromPdf(selectedIds);
    } finally {
      setIsQueueingUpdate(false);
    }
    setSelection(emptySelection);
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
          onClick={() => { setShowImport(v => !v); if (selectionActive) clearSelection(); }}
          title={t.grimoire.addSpells}
        >
          <FontAwesomeIcon icon={faPlus} />
          {t.grimoire.addSpells}
        </button>
        <button
          data-testid="select-mode-btn"
          className={`${s.toolbarBtn} ${selectionActive ? s.toolbarBtnActive : ''}`}
          onClick={toggleSelectionMode}
          title={selectionActive ? t.grimoire.cancelSelection : t.grimoire.selectMode}
        >
          <FontAwesomeIcon icon={selectionActive ? faXmark : faCheckSquare} />
          {selectionActive ? t.grimoire.cancelSelection : t.grimoire.selectMode}
        </button>
      </div>

      {filter === 'cloud' ? (
        <EmptyState testId="grimoire-cloud-empty" icon={faCloud} message={t.storage.cloudSyncDesc} />
      ) : (
        <SpellList
          query={query}
          filter={filter}
          selectionMode={selectionActive}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectableIdsChange={setSelectableIds}
          onItemModifiedClick={handleItemModifiedClick}
          onBoxStart={handleBoxStart}
          onBoxChange={handleBoxChange}
          onEmptyClick={handleEmptyClick}
        />
      )}

      {selectionActive && (
        <div className={s.bulkBar} data-testid="bulk-bar">
          <span data-testid="bulk-count" className={s.bulkCount}>
            {selectedIds.length === 1 ? t.grimoire.nSelectedOne : t.grimoire.nSelected.replace('{n}', String(selectedIds.length))}
          </span>
          {/* The app's own buttons (the shared chip), sized down for the bar. */}
          <SecondaryButton
            data-testid="select-all-btn"
            className={s.bulkAction}
            icon={allSelected ? faSquare : faCheckDouble}
            disabled={selectableIds.length === 0}
            onClick={toggleSelectAll}
          >
            {allSelected ? t.grimoire.unselectAll : t.grimoire.selectAll}
          </SecondaryButton>
          <PrimaryButton
            data-testid="bulk-update-from-pdf-btn"
            className={s.bulkAction}
            icon={faArrowsRotate}
            disabled={isQueueingUpdate || selectedIds.length === 0}
            onClick={() => setShowUpdateFromPdfModal(true)}
          >
            {t.grimoire.updateFromPdf}
          </PrimaryButton>
          <PrimaryButton
            data-testid="bulk-delete-btn"
            className={s.bulkAction}
            variant="danger"
            icon={faTrash}
            disabled={selectedIds.length === 0}
            onClick={() => setShowBulkDeleteModal(true)}
          >
            {t.grimoire.deleteSelected}
          </PrimaryButton>
        </div>
      )}

      {showBulkDeleteModal && (
        <DeleteConfirmModal
          show={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={t.spell.deleteTitle}
          message={selectedIds.length === 1 ? t.grimoire.deleteSelectedConfirmOne : t.grimoire.deleteSelectedConfirm.replace('{n}', String(selectedIds.length))}
        />
      )}

      <CustomModal compact show={showUpdateFromPdfModal} onClose={() => setShowUpdateFromPdfModal(false)} title={t.grimoire.updateFromPdfConfirmTitle}>
        <div className={s.bulkModalBody}>
          <p>{t.grimoire.updateFromPdfConfirmDesc}</p>
          <div className={s.bulkModalActions}>
            <SecondaryButton onClick={() => setShowUpdateFromPdfModal(false)}>{t.common.cancel}</SecondaryButton>
            <PrimaryButton data-testid="bulk-update-from-pdf-confirm-btn" icon={faArrowsRotate} onClick={handleUpdateFromPdfConfirm}>
              {t.grimoire.updateFromPdf}
            </PrimaryButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
