# Spellcast-Client Component Patterns Reference

All shared components live in `src/app/components/`. Import paths are relative to there.

---

## Buttons

All in `src/app/components/Buttons/`.

| Component | Variant / Use |
|---|---|
| `PrimaryButton` | Primary CTA — solid `--color-primary` background |
| `SecondaryButton` | Secondary action — transparent + border |
| `TertiaryButton` | Tertiary / ghost action |
| `IconButton` | Icon-only button. Props: `icon`, `variant` (`primary` \| `transparent`), `title`, `className`, `onClick` |
| `ActionButton` | Icon + text action button |
| `TabButton` | Tab navigation button |
| `CopyButton` | Copy-to-clipboard with feedback |
| `ProfileButton` | User profile trigger |

**Rule:** Never create one-off `<button>` elements styled ad-hoc. Always use one of the components above.

`IconButton` is the standard for icon-only actions (back buttons, close buttons, player controls). Use `variant="transparent"` for inline icon actions.

---

## Section Headers

Use `<SectionHeader>` (`src/app/components/SectionHeader/index.tsx`) for every page or section title.

```tsx
<SectionHeader
  icon={faIcon}          // FontAwesome icon — rendered in a colored chip
  title="Title"
  subtitle="Optional"   // --color-light-400 color
  align="left"          // 'left' (default) | 'center'
  count={42}            // renders a <Tag> badge next to the title
  action={<Button />}   // rendered to the right of the title row
/>
```

**Rule:** Never build a custom header row with a raw `<h1>`/`<h2>` + icon. Always use `SectionHeader`.

---

## Modals

Use `<CustomModal>` (`src/app/components/Modals/CustomModal/`).

```tsx
<CustomModal isOpen={isOpen} onClose={handleClose}>
  <MyContent />
</CustomModal>
```

Open/close is controlled via the `isOpen` prop — NOT via DOM refs (unlike StreamBy-UI which uses `element.style.display`).

**Rule:** New modals must use `CustomModal`. Never create custom overlay divs with `position: fixed` and manual z-index.

---

## Cards

All in `src/app/components/Cards/`.

| Component | Use |
|---|---|
| `DocumentCard` | Document library list item |
| `GroupCard` | Group list item |
| `CredentialCard` | API credential list item |
| `EditorPickerCard` | Document picker in /editor/select |

---

## Inputs

All in `src/app/components/Inputs/`.

| Component | Use |
|---|---|
| `LabeledInput` | Standard text input with label |
| `NumberStepper` | Integer +/- stepper |
| `ToggleRow` | Boolean toggle with label |

**Rule:** Never use raw `<input type="text">` or `<select>` for user-facing forms. Use the above components.

---

## Tabs

All in `src/app/components/Tabs/` and `src/app/components/Selectors/`.

| Component | Use |
|---|---|
| `TabBar` | Mobile/bottom navigation bar |
| `FilterTabs` | Horizontal filter tab group (compact variant available) |

---

## Tag

`<Tag>` (`src/app/components/Tag/Tag.tsx`) — for inline badges, counts, and status chips.

Props: `tone` (`default` \| `primary` \| …), `size` (`sm` \| `md`).

**Rule:** Never create custom badge divs/spans. Use `<Tag>`.

---

## Spinner

`<Spinner>` (`src/app/components/Spinner/`) — for loading states.

```tsx
<Spinner isLoading />
```

**Rule:** Never create custom spinner animations. Use `<Spinner>`.

---

## CSS Module conventions

```ts
import s from './index.module.css';  // always aliased `s`
```

- **No inline styles** except layout one-liners on wrapper elements: `style={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}`
- **Pages** (`src/app/pages/`) and **layouts** (`src/app/layouts/`) must NOT have `.module.css` files — use global classes from `src/styles/globals.css`
- All class names in camelCase inside the module file
- Hover states as `:hover` pseudo-classes in the same `.css` file
- Responsive breakpoint: `@media (max-width: 1024px)` (desktop → mobile)

---

## Testing conventions

- Test files live in a `__tests__/` subdirectory alongside the component:
  ```
  src/app/components/Buttons/
  ├── IconButton.tsx
  └── __tests__/
      └── IconButton.test.tsx
  ```
- Framework: Vitest + React Testing Library
- **Element selection: always `data-testid`** — never `getByText`, `getByRole`, or CSS selectors
- `data-testid` pattern: `kebab-case`, scoped to the component (e.g., `document-card`, `document-card-delete-btn`)
- Redux-connected components need a store `<Provider>` wrapper
- Router-dependent components need `<MemoryRouter>`

Minimum coverage per component:
1. Renders without crashing
2. Renders with required props / different prop variants
3. User interactions (click, input, etc.)
4. Loading state (spinner shown, content hidden)
5. Empty / disabled state
