import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { FuseModal } from '../FuseModal';
import { mergeSpells, type SpellSnapshot } from '../../../../utils/spellDiff';
import type { FusePlan } from '../../../../utils/spellVersions';

const p = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const page = (...blocks: JSONContent[]): JSONContent => ({ type: 'doc', content: blocks });
const snap = (pages: JSONContent[], over: Partial<SpellSnapshot> = {}): SpellSnapshot => ({ title: 'T', cover: null, originalPages: null, pages, ...over });
const KEPT = 'The old house stood at the end of the lane, its windows dark for many years.';

const mergePlan = (base: SpellSnapshot, ours: SpellSnapshot, theirs: SpellSnapshot): FusePlan => ({
  kind: 'merge', theirsVersion: 'draft', merge: mergeSpells(base, ours, theirs),
  cover: { ours: null, theirs: null }, readImage: vi.fn(async () => null), apply: vi.fn(),
});

const renderModal = (over: Partial<Parameters<typeof FuseModal>[0]> = {}) => {
  const props = {
    show: true, ours: 'source', others: ['draft', 'notes'], picked: null, plan: null,
    onPick: vi.fn(), onFuse: vi.fn(), onClose: vi.fn(), ...over,
  };
  renderWithProviders(<FuseModal {...props} />);
  return props;
};

describe('FuseModal', () => {
  it('offers the other versions to pick, and nothing to fuse until one is picked', () => {
    const props = renderModal();
    expect(screen.queryByTestId('fuse-confirm')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fuse-version-notes'));
    expect(props.onPick).toHaveBeenCalledWith('notes');
    fireEvent.click(screen.getByTestId('fuse-cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('says a version is in this one already, with nothing to fuse', () => {
    renderModal({ picked: 'draft', plan: { kind: 'upToDate', theirsVersion: 'draft' } });
    expect(screen.getByTestId('fuse-up-to-date').textContent).toContain('draft');
    expect(screen.queryByTestId('fuse-confirm')).not.toBeInTheDocument();
  });

  it('a version that is behind is moved forward on confirming', () => {
    const props = renderModal({ picked: 'draft', plan: { kind: 'fastForward', theirsVersion: 'draft', apply: vi.fn() } });
    expect(screen.getByTestId('fuse-fast-forward')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fuse-confirm'));
    expect(props.onFuse).toHaveBeenCalledWith([]);
  });

  it('a merge with no dissonances fuses right away', () => {
    const base = snap([page(p(KEPT))]);
    const plan = mergePlan(base, snap([page(p(KEPT))], { title: 'Renamed' }), snap([page(p(KEPT)), page(p('A new page.'))]));
    renderModal({ picked: 'draft', plan });
    expect(screen.getByTestId('fuse-clean')).toBeInTheDocument();
    expect(screen.getByTestId('fuse-confirm')).toBeEnabled();
  });

  it('fuses only once every dissonance is resolved, each as chosen', () => {
    const base = snap([page(p(KEPT), p('It was painted white.'))], { title: 'Old' });
    const ours = snap([page(p(KEPT), p('It was painted red.'))], { title: 'Ours' });
    const theirs = snap([page(p(KEPT), p('It was painted blue.'))], { title: 'Theirs' });
    const props = renderModal({ picked: 'draft', plan: mergePlan(base, ours, theirs) });

    const [title, block] = screen.getAllByTestId('fuse-dissonance');
    expect(title.textContent).toContain('Ours');
    expect(title.textContent).toContain('Theirs');
    // Only a block can keep both sides.
    expect(title.querySelector('[data-testid="fuse-choice-both"]')).toBeNull();
    expect(block.textContent).toContain('It was painted red.');
    expect(block.textContent).toContain('It was painted blue.');

    const confirm = screen.getByTestId('fuse-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.click(title.querySelector('[data-testid="fuse-choice-theirs"]')!);
    expect(screen.getByTestId('fuse-resolved-count').textContent).toContain('1');
    expect(confirm).toBeDisabled();
    fireEvent.click(block.querySelector('[data-testid="fuse-choice-both"]')!);
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(props.onFuse).toHaveBeenCalledWith(['theirs', 'both']);
  });
});
