import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addApiResponse } from '../store/apiResponsesSlice';
import { invalidateSpellList } from '../store/spellReaderSlice';
import { useLanguage } from '../i18n';
import { importSpellFromFile } from '../utils/spellFormat';
import { SpellLockedError } from '../utils/spellProtection';
import { accessKeys } from '../services/accessKeys';

// A protected file's password asked for: its name, whether the one given before wasn't it,
// and while it's being tried.
export interface UnlockPrompt {
  fileName: string;
  wrong: boolean;
  busy: boolean;
  submit: (password: string) => void;
  cancel: () => void;
}

/**
 * Shared "import a .spell file" flow (TCORE-78) — hydrates a new Spell (+ any bundled
 * audio) into IndexedDB, then invalidates the spell list so it shows up without a manual
 * refresh. Lives in src/hooks/ for the same layering reason as useSpellExport.
 *
 * Exposes a plain `importFile(file)` rather than owning a hidden `<input>` itself: its
 * callers (ImportOption, Start's Read tab) each have their own file input/dropzone and just
 * need to route a `.spell` File here.
 *
 * A protected file opens with one of the caster's access keys, if it has a slot for one;
 * else its password is asked for (`unlockPrompt`, for the caller to show), until it's the
 * right one or the caster gives up.
 */
export function useSpellImport() {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector((state) => state.session);
  const [isImporting, setIsImporting] = useState(false);
  const [prompt, setPrompt] = useState<{ fileName: string; wrong: boolean; busy: boolean } | null>(null);
  const answer = useRef<((password: string | null) => void) | null>(null);

  // The caster's answer: a password, or null (gave up).
  const askPassword = (fileName: string, wrong: boolean) => new Promise<string | null>(resolve => {
    answer.current = resolve;
    setPrompt({ fileName, wrong, busy: false });
  });
  // Gone (its card, or Import, closed) while a password is asked for: given up on, so the
  // import doesn't wait forever for an answer nobody can give anymore.
  useEffect(() => () => { answer.current?.(null); answer.current = null; }, []);
  const reply = (password: string | null) => {
    const resolve = answer.current;
    answer.current = null;
    if (password === null) setPrompt(null);
    else setPrompt(p => p && { ...p, busy: true });
    resolve?.(password);
  };

  // Resolves to the new spell's id (null if it couldn't be imported, undefined if the caster
  // gave up on its password), so a caller can go on to use it -- e.g. start reading it right away.
  const importFile = async (file: File): Promise<string | null | undefined> => {
    if (!userData.id) return null;

    setIsImporting(true);
    const name = file.name.replace(/\.spell$/i, '');
    try {
      // Without them (the account not reached), it's still opened with its password.
      const keys = await accessKeys().catch(() => []);
      let spellId: string | null = null;
      let password: string | undefined;
      while (spellId === null) {
        try {
          spellId = await importSpellFromFile(file, userData.id, { keys, password });
        } catch (error) {
          if (!(error instanceof SpellLockedError)) throw error;
          if (!error.password) {
            dispatch(addApiResponse({ message: t.protect.noKey.replace('{name}', name), type: 'error' }));
            return null;
          }
          const given = await askPassword(name, error.wrong);
          if (given === null) return undefined;
          password = given;
        }
      }
      setPrompt(null);
      dispatch(invalidateSpellList());
      dispatch(addApiResponse({ message: t.spell.importSuccess.replace('{title}', name), type: 'success' }));
      return spellId;
    } catch (error) {
      setPrompt(null);
      console.error('Failed to import .spell file:', error);
      dispatch(addApiResponse({ message: t.spell.importError, type: 'error' }));
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  const unlockPrompt: UnlockPrompt | null = prompt && {
    ...prompt,
    submit: (password) => reply(password),
    cancel: () => reply(null),
  };

  return { importFile, isImporting, unlockPrompt };
}
