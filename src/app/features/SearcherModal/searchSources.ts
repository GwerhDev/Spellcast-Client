import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import type { Spell } from '../../../interfaces';
import { getSpellById, getSpellsFromDB } from '../../../db';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setShowReaderSettings } from '../../../store/spellReaderSlice';
import { setShowEditorSettings } from '../../../store/editorSlice';
import { useLanguage } from '../../../i18n';
import { isOffered, matchesQuery, settingsSearchEntries, SettingsSearchEntry } from '../../../config/settingsSearch';

// What the app's search searches, shared by its tabs: the grimoire's Spells, the open Spell's
// pages and text, and the settings.

// ── The grimoire's Spells ──

/** The caster's Spells (their grimoire): null while they're read. */
export function useGrimoireSpells(): Spell[] | null {
  const { userData } = useAppSelector(state => state.session);
  const [spells, setSpells] = useState<Spell[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSpellsFromDB(userData.id).then(list => { if (!cancelled) setSpells(list); }).catch(() => { if (!cancelled) setSpells([]); });
    return () => { cancelled = true; };
  }, [userData.id]);
  return spells;
}

/** The Spells whose title, author or tags have the query. */
export const filterSpells = (spells: Spell[], query: string) => {
  const q = query.trim().toLowerCase();
  return spells.filter(spell =>
    !q || [spell.title, spell.author ?? '', ...(spell.tags ?? [])].some(text => text.toLowerCase().includes(q)));
};

/** Opens a Spell (its page). */
export function useOpenSpell(onDone: () => void) {
  const navigate = useNavigate();
  return (spell: Spell) => {
    onDone();
    navigate(`/spell/${spell.id}`);
  };
}

// ── The open Spell's pages and text ──

const extractFullText = (raw: string): string => {
  try {
    const node = JSON.parse(raw) as JSONContent;
    const parts: string[] = [];
    const walk = (n: JSONContent) => {
      if (n?.type === 'text' && n.text) parts.push(n.text as string);
      if (Array.isArray(n?.content)) n.content.forEach(walk);
    };
    walk(node);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

const getSnippet = (text: string, maxLen = 80) =>
  text ? text.slice(0, maxLen) + (text.length > maxLen ? '…' : '') : '';

/** The open Spell's pages: each one's text, and its beginning (a snippet). */
export function useSpellPages(spellId: string | null) {
  const { userData } = useAppSelector(state => state.session);
  const [fullTexts, setFullTexts] = useState<string[]>([]);
  const [snippets, setSnippets] = useState<string[]>([]);
  useEffect(() => {
    if (!spellId) return;
    let cancelled = false;
    getSpellById(spellId, userData.id).then(doc => {
      if (cancelled || !doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as JSONContent[];
      const texts = pages.map(p => extractFullText(JSON.stringify(p)));
      setFullTexts(texts);
      setSnippets(texts.map(text => getSnippet(text)));
    });
    return () => { cancelled = true; };
  }, [spellId, userData.id]);
  return { fullTexts, snippets };
}

export interface TextMatch {
  page: number;
  context: string;
  matchStart: number;
  matchEnd: number;
}

/** Where the query is in the pages' text (a few times a page), with what's around it. */
export const findTextMatches = (fullTexts: string[], query: string, perPageMax = 3): TextMatch[] => {
  const matches: TextMatch[] = [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return matches;
  const q = trimmed.toLowerCase();
  fullTexts.forEach((text, idx) => {
    const lower = text.toLowerCase();
    let from = 0;
    let perPage = 0;
    while (perPage < perPageMax) {
      const pos = lower.indexOf(q, from);
      if (pos === -1) break;
      const ctxStart = Math.max(0, pos - 60);
      const ctxEnd = Math.min(text.length, pos + q.length + 60);
      const prefix = ctxStart > 0 ? '…' : '';
      const suffix = ctxEnd < text.length ? '…' : '';
      matches.push({
        page: idx + 1,
        context: prefix + text.slice(ctxStart, ctxEnd) + suffix,
        matchStart: pos - ctxStart + prefix.length,
        matchEnd: pos - ctxStart + q.length + prefix.length,
      });
      from = pos + q.length;
      perPage++;
    }
  });
  return matches;
};

// ── The settings ──

export interface SettingsResult extends SettingsSearchEntry {
  label: string;
  desc: string;
  keywords: string;
}

/** The settings offered here (with their texts), those matching a query, and how to open one. */
export function useSettingsSearch(onDone: () => void, onOpenPlayerSettings?: () => void) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const spellOpen = Boolean(useAppSelector(state => state.spellReader.spellId));
  const where = { spellOpen, inEditor: pathname.startsWith('/editor/') };
  const offered: SettingsResult[] = settingsSearchEntries.filter(entry => isOffered(entry, where)).map(entry => ({
    ...entry,
    label: t.search[entry.key],
    desc: t.search[`${entry.key}Desc` as keyof typeof t.search],
    keywords: t.search[`${entry.key}Keywords` as keyof typeof t.search],
  }));
  const find = (query: string) => offered.filter(entry => matchesQuery(entry, query));
  const open = (entry: SettingsSearchEntry) => {
    onDone();
    if (entry.path) navigate(entry.path);
    else if (entry.panel === 'reader') dispatch(setShowReaderSettings(true));
    else if (entry.panel === 'editor') dispatch(setShowEditorSettings(true));
    else if (entry.panel === 'player') onOpenPlayerSettings?.();
  };
  return { find, open };
}
