import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellDiffModal } from '../SpellDiffModal';
import { diffSpells, type SpellSnapshot } from '../../../../utils/spellDiff';
import type { SpellChanges } from '../../../../utils/spellVersions';

const p = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const page = (...blocks: JSONContent[]): JSONContent => ({ type: 'doc', content: blocks });
const changesOf = (from: SpellSnapshot, to: SpellSnapshot, readImage: SpellChanges['readImage'] = vi.fn(async () => null)): SpellChanges => ({
  diff: diffSpells(from, to), from, to, cover: { from: null, to: null }, readImage,
});
const snap = (pages: JSONContent[], over: Partial<SpellSnapshot> = {}): SpellSnapshot => ({ title: 'T', cover: null, originalPages: null, pages, ...over });

describe('SpellDiffModal', () => {
  it('shows it is reading while there are no changes yet', () => {
    renderWithProviders(<SpellDiffModal show title="Changes" changes={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('spell-diff')).not.toBeInTheDocument();
  });

  it('lists only the pages that changed, each marked, and the details changed', () => {
    const from = snap([page(p('one')), page(p('two')), page(p('three'))], { title: 'Old', tags: ['a'] });
    const to = snap([page(p('new')), page(p('one')), page(p('three, edited'))], { title: 'New', tags: ['b'] });
    renderWithProviders(<SpellDiffModal show title="Changes" changes={changesOf(from, to)} onClose={vi.fn()} />);
    expect(screen.getByTestId('diff-detail-title').textContent).toContain('Old');
    expect(screen.getByTestId('diff-detail-title').textContent).toContain('New');
    expect(screen.getByTestId('diff-tags').textContent).toContain('+ b');
    expect(screen.getByTestId('diff-tags').textContent).toContain('− a');
    // page('two') removed, page('three') changed, page('new') added; page('one') unchanged isn't listed.
    expect(screen.getByTestId('diff-page-added')).toBeInTheDocument();
    expect(screen.getByTestId('diff-page-removed')).toBeInTheDocument();
    expect(screen.getByTestId('diff-page-changed')).toBeInTheDocument();
    expect(screen.queryByTestId('diff-page-same')).not.toBeInTheDocument();
  });

  it("a changed page shows its blocks marked, and the words added and taken out", () => {
    const from = snap([page(p('kept'), p('the quick fox'), p('gone'))]);
    const to = snap([page(p('kept'), p('the slow fox'), p('added'))]);
    renderWithProviders(<SpellDiffModal show title="Changes" changes={changesOf(from, to)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('diff-page-changed'));
    const detail = screen.getByTestId('diff-page-detail');
    expect(detail.querySelectorAll('[data-testid="diff-block-same"]')).toHaveLength(1);
    expect(detail.querySelectorAll('[data-testid="diff-block-changed"]')).toHaveLength(1);
    // Nothing in common: one block taken out, another put in.
    expect(detail.querySelectorAll('[data-testid="diff-block-removed"]')).toHaveLength(1);
    expect(detail.querySelectorAll('[data-testid="diff-block-added"]')).toHaveLength(1);
    expect(screen.getAllByTestId('diff-word-removed').map(e => e.textContent)).toEqual(['quick']);
    expect(screen.getAllByTestId('diff-word-added').map(e => e.textContent)).toEqual(['slow']);
  });

  it("reads a page's image only when it's shown", async () => {
    const readImage = vi.fn(async () => new Blob(['img'], { type: 'image/png' }));
    const image: JSONContent = { type: 'image', attrs: { src: `spell-asset:${'a'.repeat(64)}.png` } };
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:img');
    const from = snap([]);
    const to = snap([page(image, p('caption'))]);
    renderWithProviders(<SpellDiffModal show title="Changes" changes={changesOf(from, to, readImage)} onClose={vi.fn()} />);
    await waitFor(() => expect(readImage).toHaveBeenCalledWith('to', `assets/${'a'.repeat(64)}.png`));
    createUrl.mockRestore();
  });

  it('says so when nothing changed', () => {
    const same = snap([page(p('one'))]);
    renderWithProviders(<SpellDiffModal show title="Changes" changes={changesOf(same, same)} onClose={vi.fn()} />);
    expect(screen.getByTestId('diff-nothing')).toBeInTheDocument();
  });
});
