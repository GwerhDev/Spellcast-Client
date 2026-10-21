import s from './index.module.css';
import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
import { useAppDispatch } from '../../../store/hooks';
import { addApiResponse } from '../../../store/apiResponsesSlice';
import { ACCESS_KEYS_ENABLED } from '../../../config/consts';
import { createAccessKey, deleteAccessKey, listAccessKeys, type AccessKeyInfo } from '../../../services/accessKeys';
import { LabeledInput } from '../../components/Inputs/LabeledInput';
import { PrimaryButton } from '../../components/Buttons/PrimaryButton';
import { IconButton } from '../../components/Buttons/IconButton';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Spinner } from '../../components/Spinner';

// The caster's access keys (see services/accessKeys): made with a name, listed with when they
// were made, deleted after confirming -- a .spell protected only with a key deleted can't be
// opened anymore. Until the account keeps them (ACCESS_KEYS_ENABLED) the section shows
// disabled, marked as coming, and nothing is asked for.
export const AccessKeys = () => {
  const { t, language } = useLanguage();
  const dispatch = useAppDispatch();
  const [keys, setKeys] = useState<AccessKeyInfo[] | null>(ACCESS_KEYS_ENABLED ? null : []);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AccessKeyInfo | null>(null);

  const report = useCallback((err: unknown) => {
    console.error('Access keys:', err);
    dispatch(addApiResponse({ message: t.accessKeys.error, type: 'error' }));
  }, [dispatch, t]);

  const reload = useCallback(async () => {
    try {
      setKeys(await listAccessKeys());
    } catch (err) {
      setKeys([]);
      report(err);
    }
  }, [report]);

  useEffect(() => { if (ACCESS_KEYS_ENABLED) void reload(); }, [reload]);

  const trimmed = name.trim();
  const create = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const made = await createAccessKey(trimmed);
      setName('');
      dispatch(addApiResponse({ message: t.accessKeys.createdToast.replace('{name}', made.name), type: 'success' }));
      await reload();
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key: AccessKeyInfo) => {
    setToDelete(null);
    try {
      await deleteAccessKey(key.id);
      dispatch(addApiResponse({ message: t.accessKeys.deletedToast.replace('{name}', key.name), type: 'success' }));
      await reload();
    } catch (err) {
      report(err);
    }
  };

  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(language);
  const disabled = !ACCESS_KEYS_ENABLED;

  return (
    <section className={`${s.container} ${disabled ? s.disabled : ''}`} data-testid="access-keys">
      <div className={s.header}>
        <span className={s.headerIcon}><FontAwesomeIcon icon={faKey} /></span>
        <div className={s.headerText}>
          <h3 className={s.title}>
            {t.accessKeys.title}
            {disabled && <span className={s.soonTag} data-testid="access-keys-soon">{t.start.soon}</span>}
          </h3>
          <p className={s.description}>{t.accessKeys.description}</p>
        </div>
      </div>

      {disabled && <p className={s.note}>{t.accessKeys.soonNote}</p>}

      <form className={s.create} onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <LabeledInput
          id="access-key-name" htmlFor="access-key-name" name="access-key-name"
          label={t.accessKeys.name} placeholder={t.accessKeys.namePlaceholder}
          value={name} disabled={disabled || busy} onChange={(e) => setName(e.target.value)}
        />
        <PrimaryButton type="submit" data-testid="access-keys-create" icon={faPlus} disabled={disabled || busy || !trimmed}>
          {t.accessKeys.create}
        </PrimaryButton>
      </form>

      {keys === null ? (
        <Spinner isLoading />
      ) : keys.length === 0 ? (
        !disabled && <EmptyState icon={faKey} message={t.accessKeys.empty} testId="access-keys-empty" />
      ) : (
        <ul className={s.list}>
          {keys.map(key => (
            <li key={key.id} className={s.item} data-testid={`access-key-${key.id}`}>
              <FontAwesomeIcon icon={faKey} className={s.itemIcon} />
              <div className={s.itemText}>
                <span className={s.itemName}>{key.name}</span>
                <span className={s.itemDate}>{t.accessKeys.created.replace('{date}', dateOf(key.createdAt))}</span>
              </div>
              <IconButton
                data-testid={`access-key-delete-${key.id}`} icon={faTrash} title={t.accessKeys.delete}
                className={s.delete} onClick={() => setToDelete(key)}
              />
            </li>
          ))}
        </ul>
      )}

      <DeleteConfirmModal
        show={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) void remove(toDelete); }}
        title={t.accessKeys.deleteTitle.replace('{name}', toDelete?.name ?? '')}
        message={t.accessKeys.deleteMessage}
      />
    </section>
  );
};
