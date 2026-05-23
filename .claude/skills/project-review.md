# Skill: project-review

Review the Spellcast Client codebase for architectural compliance as defined in CLAUDE.md.

## What to check

### 1. Layer violations

Scan `src/app/components/` for components that access Redux, the DB, or services directly — these are feature-in-transit components that should eventually move to `src/app/features/`. For each violation found:
- File path
- Which forbidden import it uses (`useSelector`, `useDispatch`, `getDocumentsFromDB`, `services/`, etc.)
- Suggested target layer

Use Grep to find:
```
useSelector|useDispatch|useAppSelector|useAppDispatch
```
inside `src/app/components/` and cross-reference against the presentational-only list in CLAUDE.md.

### 2. Missing `__tests__/` directories

For every component directory in `src/app/components/`, `src/app/features/`, `src/app/layouts/`, and `src/store/` — check whether a `__tests__/` subdirectory with at least one `.test.tsx` or `.test.ts` file exists. Report all missing ones grouped by priority:

- **High:** Feature components and Redux slices (they contain logic worth protecting)
- **Medium:** Presentational components with non-trivial rendering logic
- **Low:** Simple wrappers, icon buttons, layout shells

### 3. Hardcoded UI strings

Grep for string literals in JSX that are not i18n keys. Flag any visible English text directly in `.tsx` files that isn't wrapped in `t.something`.

Pattern to look for: JSX string content that isn't a variable — e.g., `>Some text<`, `placeholder="..."`, `title="..."`, `aria-label="..."`.

### 4. Pages that are too fat

Pages in `src/app/pages/` should be thin routing wrappers. If a page file contains more than ~40 lines of non-import, non-JSX logic (fetching, dispatch calls, complex state), flag it as a candidate for extracting a feature component.

### 5. Direct idb / service imports in components

Any file inside `src/app/components/` that imports directly from `src/db/` or `src/services/` (other than via the store/feature layer) is a layer violation. Report path and import.

### 6. Test infrastructure

Check whether Vitest is installed and configured:
- `vitest` present in `package.json` devDependencies
- `vite.config.ts` has a `test` block with `environment: 'jsdom'`
- A `src/test/setup.ts` exists with `@testing-library/jest-dom` matchers

If not configured, report the full setup needed.

### 7. Missing `data-testid` attributes

Scan existing test files (`**/__tests__/*.test.tsx`) for uses of `getByText`, `getByRole`, `querySelector`, or other non-testid queries. These violate the project's test selection rule (all element lookups must use `getByTestId`). Report each occurrence as a test-quality violation.

Also flag component files that have a corresponding test but lack `data-testid` attributes on their interactive elements.

---

## Output format

Return a report with four sections:

```
## Architecture Violations
[table: file | violation type | severity | suggested fix]

## Missing Tests
### High Priority
- path/to/Component — reason
### Medium Priority
...

## Hardcoded Strings
[file:line — the string]

## Test Infrastructure
[configured / not configured + what's missing]
```

Severity: 🔴 High (blocks migration) / 🟡 Medium (tech debt) / 🟢 Low (cosmetic)

Keep the report concise. Group items by directory when there are many in the same folder. Do not suggest fixes in-line — this is a diagnostic report only.
