---
description: Full audit of Spellcast-Client — components, features, pages, store, and i18n. Checks layer violations, component reuse, style tokens, missing tests, and hardcoded strings. Produces a prioritized remediation plan. Use when you want a complete review of one or more files, a directory, or the entire project.
---

You are the lead reviewer for Spellcast-Client. Your job is to audit code against the project's design system and architecture conventions, then produce a prioritized remediation plan.

First, read both reference files:
- `Spellcast-Client/.claude/skills/ui-review/design-system.md` — CSS token system
- `Spellcast-Client/.claude/skills/ui-review/component-patterns.md` — component patterns and test conventions

If `$ARGUMENTS` is provided, review that specific file, component, or directory.
If no argument is given, ask the user what scope to review (single component, directory, or full project).

---

## Scope of review

Review ALL source files in scope. The full project scope is:

```
src/app/components/   ← component reuse, style tokens, modularity, layer violations
src/app/features/     ← layer compliance, store usage, DB/service access
src/app/pages/        ← thin-wrapper violations, inline styles, logic in pages
src/app/layouts/      ← duplicated logic, missing hook extractions
src/store/            ← transient UI state in Redux, slice design
src/hooks/            ← mixed concerns, fragile dependencies
src/services/         ← service pattern deviations
src/i18n/             ← missing keys, untranslated strings
```

---

## What to check

### A. Layer violations

Spellcast uses a four-layer architecture (layouts → pages → features → components). Violations:

- **`src/app/components/` accessing Redux:** grep for `useSelector|useDispatch|useAppSelector|useAppDispatch` inside `components/`. These are "feature components in transit" — flag path, forbidden import, and suggested target layer (`features/`).
- **`src/app/components/` accessing DB or services:** any import of `src/db/` or `src/services/` (outside of feature layer) is a layer violation. Report path and import.
- **`src/app/pages/` too fat:** pages must be thin routing wrappers. Flag any page file with more than ~40 lines of non-import, non-JSX logic (fetching, dispatch calls, complex state) as a candidate for extracting a feature component.

### B. Component reuse violations

These design system components **must** be used everywhere they fit — find every place they aren't:

| Should use | Instead of |
|---|---|
| `PrimaryButton` / `SecondaryButton` / `TertiaryButton` / `IconButton` | Raw `<button>` with ad-hoc CSS |
| `ActionButton` | Custom icon+text button |
| `SectionHeader` | Raw `<h1>`/`<h2>` + icon row |
| `CustomModal` | Custom overlay divs with `position:fixed` |
| `LabeledInput` | Raw `<input type="text">` |
| `Spinner` | Custom loading spinner divs/animations |
| `Tag` | Custom badge/chip divs |

Also flag **duplicate components**: if a component in one subdirectory is nearly identical to one in another, report both paths.

### C. Style violations

**CSS Modules scope rule**: Only `src/app/components/` and `src/app/features/` may have `.module.css` files. Pages (`src/app/pages/`) and layouts (`src/app/layouts/`) must NOT have their own `.module.css`. Styling must come from global classes in `src/styles/globals.css`.

For every `.module.css` file reviewed:

- **Hardcoded colors**: Any `#xxxxxx`, `rgb()`, or `rgba()` that maps to a `--color-*` token → flag with the correct token.
- **Hardcoded spacing**: `gap`, `padding`, `margin` in raw `px` that maps to a `--size-*` token.
- **Inline styles in TSX**: Only `flexGrow`, `minHeight`, `overflow` are permitted on layout wrappers. Flag all others.
- **CSS Modules import**: Must be `import s from './index.module.css'` (aliased `s`). Flag any deviation.

### D. Props and TypeScript

- Flag any `props: any` or `field: any` in interfaces.
- Flag components over ~150 lines that could benefit from extraction.

### E. i18n violations

- Grep `.tsx` files for visible string literals in JSX that are not i18n keys (`t.something`).
- Patterns to look for: JSX string content — e.g., `>Some text<`, `placeholder="..."`, `title="..."`, `aria-label="..."` with hardcoded English text.
- Exception: `data-testid` values and technical identifiers do not need i18n.

### F. Tests

Check test infrastructure:
- `vitest` present in `package.json` devDependencies
- `vite.config.ts` has a `test` block with `environment: 'jsdom'`
- `src/test/setup.ts` exists with `@testing-library/jest-dom` matchers

Report missing `__tests__/` directories grouped by priority:
- **High:** Feature components and Redux slices (contain logic worth protecting)
- **Medium:** Presentational components with non-trivial rendering logic
- **Low:** Simple wrappers, icon buttons, layout shells

In existing test files, flag:
- Use of `getByText`, `getByRole`, or CSS selectors — must use `getByTestId` exclusively
- Missing `data-testid` attributes on interactive elements in components that have tests

---

## Output format

For each file reviewed, produce a findings block:

```
### src/app/components/X/Y.tsx

Layer
✓ No store or DB imports
⚠ useAppSelector on line 12 — move to src/app/features/X/

Component reuse
✓ Uses SectionHeader
⚠ Raw <button> line 40 — use <IconButton variant="transparent" icon={faTrash} onClick={...} />
⚠ Raw <input type="text"> line 120 — use <LabeledInput />

Style
✓ CSS Modules imported as `s`
⚠ Hardcoded `#3c3c3c` in Y.module.css line 12 — use `var(--color-dark-300)`
⚠ inline `style={{ opacity: 0.5 }}` line 289 — move to CSS class

i18n
✓ No hardcoded strings
⚠ placeholder="Search…" line 84 — use `t.common.search`

Tests
⚠ No __tests__/ directory — HIGH priority (feature component with Redux)
```

---

## Remediation plan

After all findings, produce a **prioritized plan** grouped by effort:

```
## Remediation Plan

### P1 — Quick wins (low effort, high consistency impact)
- [ ] Replace hardcoded colors in [list files]
- [ ] Fix props: any in [list files]
- [ ] Wrap hardcoded strings in t.* in [list files]

### P2 — Component reuse (medium effort, high architecture impact)
- [ ] Replace raw <button> elements with IconButton/PrimaryButton/SecondaryButton (list files)
- [ ] Replace raw <input> elements with LabeledInput (list files)
- [ ] Replace custom modal overlays with CustomModal (list files)
- [ ] Move inline styles in pages/layouts to globals.css

### P3 — Architecture (higher effort, pay down tech debt)
- [ ] Move feature-in-transit components from components/ to features/ (list files)
- [ ] Extract logic from fat pages into feature components (list files)
- [ ] [Any other architecture-level items found]

### P4 — Test coverage (ongoing)
- [ ] Configure Vitest (if not configured)
- [ ] Scaffold __tests__/ for High-priority components (list)
- [ ] Scaffold __tests__/ for Medium-priority components (list)
- [ ] Fix getByText/getByRole → getByTestId in existing tests (list)
```

Show counts: total findings, by severity (P1/P2/P3/P4), by category.

---

## Scaffolding a test stub

When a `__tests__/` directory and test file are missing, scaffold a stub:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '../index';

describe('ComponentName', () => {
  it('renders without crashing', () => {
    // TODO: implement
  });

  it('renders with required props', () => {
    // TODO: implement
  });

  it('handles user interaction', async () => {
    // TODO: implement
  });

  it('shows loading state', () => {
    // TODO: implement
  });

  it('shows empty/disabled state', () => {
    // TODO: implement
  });
});
```

Save at `src/app/components/X/__tests__/X.test.tsx` and report the path.
