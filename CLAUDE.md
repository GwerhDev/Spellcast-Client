# Spellcast Client — Architecture Guide

## Project Overview

Spellcast is a PDF document reader and editor with Text-to-Speech capabilities. Users import PDFs, read them with browser or AI voices, edit pages, and manage their library — all stored locally via IndexedDB with optional cloud sync planned.

**Stack:** React 18 · TypeScript · Vite · Redux Toolkit · React Router v6 · pdfjs-dist · Tiptap · IndexedDB · CSS Modules · i18n (custom) · FontAwesome

---

## Target Architecture

The codebase is being migrated toward a four-layer structure. **Every new component must land in the correct layer. Every component must include unit tests in a `__tests__/` subdirectory at the same level.**

### Layer 1 — `src/app/layouts/`
Shell wrappers that define how the UI is framed: persistent sidebars, player bars, global overlays (upload queue, toast, background audio). Contains no business logic or domain state. Renders `<Outlet />` for child routes.

- Currently: `DefaultLayout.tsx` (sidebar + players + workers + upload queue)
- New layouts should go here if a route group needs a different shell (e.g., fullscreen reader)

### Layer 2 — `src/app/pages/`
One file per route. Wires URL params to feature components. Does NOT contain UI markup beyond the minimum needed to compose features for that route. May read session/auth state to redirect.

```
/                    → Home.tsx
/editor              → Editor.tsx
/editor/create       → DocumentCreate.tsx
/editor/:id          → DocumentEdit.tsx
/document/:id        → DocumentDetail.tsx
/document/:id/reader → LocalDocumentReader.tsx
/library             → Library.tsx
/user/dashboard      → Overview.tsx
...
```

### Layer 3 — `src/app/features/` *(being created — currently lives inside `components/`)*
Feature components manage domain data and Redux state. They are allowed to:
- Call `useSelector` / `useDispatch`
- Read from `src/store/`, `src/db/`, `src/services/`
- Orchestrate presentational children via props

Examples of existing components that belong here once extracted:
`DocumentList`, `LibraryLanding`, `LastDocuments`, `DocumentCreateForm`, `DocumentEditForm`, `DocumentReader`, `AudioPlayer`, `BrowserPlayer`, `PdfUploadWorker`, `PdfProcessor`

### Layer 4 — `src/app/components/`
**Presentational / dumb components.** They must:
- Accept all data and callbacks via props
- Never call `useSelector`, `useDispatch`, or any store hook directly
- Never import from `src/db/` or `src/services/`
- Be reusable across features

Examples: `Buttons/*`, `Cards/DocumentCard`, `Modals/*`, `Selectors/*`, `Spinner`, `Toast`, `Inputs/*`, `Tabs/*`

> During migration, components in `src/app/components/` that still access Redux are considered "feature components in transit". Note violations in code review but do not break working code to fix them.

---

## Directory Map

```
src/
├── app/
│   ├── layouts/          # Layer 1 — shell wrappers
│   ├── pages/            # Layer 2 — one per route
│   ├── features/         # Layer 3 — domain logic (target; not yet created)
│   └── components/       # Layer 4 — presentational (+ feature-in-transit)
├── store/                # Redux slices + hooks
│   └── __tests__/        # Slice unit tests
├── db/                   # IndexedDB access (idb wrapper)
├── services/             # External API calls (auth, TTS, credentials, groups)
├── i18n/                 # Translation system
│   └── locales/          # en.ts / es.ts  — ALL user-visible strings go here
├── interfaces/           # Shared TypeScript interfaces/types
├── hooks/                # App-level custom hooks
├── utils/                # Pure utility functions (pdfUtils, etc.)
├── magictext/            # TTSDocumentReader — standalone lib component
├── config/               # App-level constants
└── assets/               # Static assets
```

---

## State Management

Redux Toolkit with typed hooks (`useAppSelector`, `useAppDispatch` from `src/store/hooks.ts`).

| Slice | Responsibility |
|---|---|
| `sessionSlice` | Auth state, user data, loader |
| `pdfReaderSlice` | Current document, page, sentence index, listVersion |
| `pdfUploadSlice` | Background upload job queue |
| `audioPlayerSlice` | AI TTS player state |
| `browserPlayerSlice` | Web Speech API player state |
| `voiceSlice` | Selected voice |
| `documentSlice` | Pending import state (pre-upload) |
| `editorSlice` | Editor session state |
| `userLibrarySlice` | Sound backgrounds, master volume |
| `credentialsSlice` | API credentials |
| `groupsSlice` | Groups |
| `apiResponsesSlice` | Shared API response cache |

**Rule:** Feature components dispatch actions. Presentational components receive state as props and call prop callbacks — never touch the store.

---

## Database (IndexedDB)

`src/db/index.ts` — all IndexedDB access goes through this module. Never import `idb` directly in components.

Key operations: `getDocumentsFromDB`, `saveDocumentToDB`, `deleteDocumentFromDB`, `getDocumentById`, `updateDocumentProgress`

Audio cache: `src/db/audioCache.ts`

---

## Services

`src/services/` — HTTP calls to the Nhexa API and third-party TTS providers. Services are pure async functions, no React hooks.

---

## i18n

Custom system in `src/i18n/`. `en.ts` is the source of truth; `es.ts` mirrors it.

**Rule:** All user-visible strings must be in the locale files. Never hardcode English text in JSX. Access via `const { t } = useLanguage()`.

---

## Styling

CSS Modules (`*.module.css`) colocated with each component. Global variables in `src/root.css`. No utility CSS frameworks.

**Design tokens:** `--color-primary`, `--color-dark-*`, `--color-light-*`, `--component-background`, `--text-color`, `--color-danger`

---

## Testing

**Framework:** Vitest + React Testing Library.

Setup required (not yet configured):
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom @testing-library/jest-dom
```

Add to `vite.config.ts`:
```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  globals: true,
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

**Convention:** Unit tests live in a `__tests__/` subdirectory inside the same directory as the file under test.

```
src/app/components/Cards/
├── DocumentCard.tsx
├── DocumentCard.module.css
└── __tests__/
    └── DocumentCard.test.tsx

src/store/
├── pdfReaderSlice.ts
└── __tests__/
    └── pdfReaderSlice.test.ts
```

### Element selection — ALWAYS use `data-testid`

**Rule:** Use `getByTestId` / `findByTestId` as the primary query strategy. Never use `getByText`, `getByRole`, or CSS selectors to locate elements in tests — these are brittle and break on copy changes or DOM restructuring.

```tsx
// ✅ Correct
<button data-testid="create-document-btn">Create</button>
screen.getByTestId('create-document-btn')

// ❌ Wrong — breaks if text changes
screen.getByText('Create')
screen.getByRole('button', { name: 'Create' })
```

Every interactive element and significant container in a component **must** have a `data-testid` when that component has tests. Use the pattern `kebab-case-description`, scoped to the component (e.g., `document-card`, `document-card-title`, `document-card-delete-btn`).

### What to test
- **Slices:** reducer logic, action creators, selectors — plain unit tests, no DOM needed
- **Presentational components:** renders correctly given props; callbacks fire on interaction
- **Feature components:** integration tests with a mocked store via `renderWithProviders`
- **Utilities:** `pdfUtils`, formatters — pure function tests

### What NOT to test
Layout shells, page routing wiring, third-party library internals (Tiptap, pdfjs).

---

## Naming Conventions

| Thing | Convention |
|---|---|
| Components | `PascalCase` |
| CSS Modules | `camelCase` class names |
| Slice files | `camelCaseSlice.ts` |
| Service files | `camelCase.ts` |
| Test files | `ComponentName.test.tsx` / `sliceName.test.ts` |
| i18n keys | `section.camelCaseKey` |

---

## Common Patterns

### Adding a new feature component
1. Create in `src/app/features/<FeatureName>/index.tsx` (or `components/` if not migrated yet)
2. Connect to store via `useAppSelector` / `useAppDispatch`
3. Extract presentational sub-components to `src/app/components/`
4. Add `__tests__/` directory with at minimum a smoke test
5. Add i18n strings to both locale files

### Adding a new route
1. Create page in `src/app/pages/<RouteName>.tsx`
2. Register in `src/App.tsx` under the appropriate `<Route>` group
3. Page should delegate to a feature component — keep the page file thin

### Invalidating the document list after writes
Dispatch `invalidateDocumentList()` from `pdfReaderSlice` — this increments `listVersion`, which `DocumentList` and `LastDocuments` observe to re-fetch.

---

## Build & Dev

```bash
npm run dev        # dev server (Vite HMR)
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run test       # vitest (once configured)
```

Path aliases (configured in `vite.config.ts`):
- `store` → `src/store`
- `services` → `src/services`
- `db` → `src/db`
- `src` → `src/`
