// Selecting items in an ordered list the way a file manager does: a click with Ctrl (⌘ on a
// Mac) adds or takes out one item, a click with Shift applies the whole run from the last
// item clicked (the anchor) to this one, and a box dragged across the list picks what it
// touches. Pure functions over ids, in the list's order -- the grid wires them to clicks.

export interface ListSelection {
  // What's selected, in the order it was picked.
  selected: string[];
  // The last item clicked: where a Shift+click's run starts.
  anchor: string | null;
}

export interface SelectionModifiers {
  // Ctrl or ⌘: this item alone, added or taken out.
  toggle: boolean;
  // Shift: the run from the anchor to this item.
  range: boolean;
}

export const emptySelection: ListSelection = { selected: [], anchor: null };

// A click on an item, with the keys held. Without modifiers it toggles the item too (the
// list is already being selected, so a click picks rather than opens).
export const clickItem = (state: ListSelection, order: string[], id: string, { range }: SelectionModifiers): ListSelection => {
  const anchor = state.anchor && order.includes(state.anchor) ? state.anchor : null;
  if (range && anchor) {
    const from = order.indexOf(anchor);
    const to = order.indexOf(id);
    if (to < 0) return state;
    const run = order.slice(Math.min(from, to), Math.max(from, to) + 1);
    // The run takes the anchor's state: selected, it's added; not, it's taken out -- so a
    // run can be cleared the same way it was made.
    const adding = state.selected.includes(anchor);
    const selected = adding
      ? [...state.selected, ...run.filter(x => !state.selected.includes(x))]
      : state.selected.filter(x => !run.includes(x));
    // The anchor stays: the next Shift+click redraws the run from the same place.
    return { selected, anchor };
  }
  const selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : [...state.selected, id];
  return { selected, anchor: id };
}

// A box dragged across the list: what it touches is selected -- on its own, or added to
// what was selected before it started (`base`, when Ctrl or Shift was held).
export const boxSelect = (base: string[], hit: string[], order: string[]): string[] => {
  const picked = new Set([...base, ...hit]);
  return order.filter(id => picked.has(id));
};
