# Spellcast Client

A document management and text-to-speech (TTS) web application. Spellcast lets users upload PDF documents, read them with sentence-level highlighting, and convert content to speech using browser-native or cloud AI voices (Azure, GCP, AWS).

---

## Features

- **PDF Upload & Reader** — Upload PDFs, extract text, and read them page by page with navigation controls
- **Text-to-Speech** — Multiple voice backends: browser Web Speech API and cloud providers (Azure, GCP, AWS)
- **Sentence Highlighting** — Tracks and highlights the sentence currently being spoken during TTS playback
- **Rich Text Editing** — TipTap-based editor to modify document content before playback
- **Audio Library** — Store and manage generated or uploaded audio files
- **User Credentials** — Manage TTS provider API keys per user
- **User Groups** — Create and manage groups for shared content
- **Dashboard & Analytics** — Overview of documents, storage usage, and activity
- **Themes** — Light, dark, and system theme with localStorage persistence
- **Keyboard Shortcuts** — Hotkey support for player controls and navigation
- **Continuous Playback** — Automatically advances TTS playback across pages
- **Export to PDF** — Export edited documents back to PDF via html2canvas + jsPDF

---

## Tech Stack

| Category | Libraries |
|---|---|
| Framework | React 19, TypeScript 5.7 |
| Build | Vite 6 |
| Routing | React Router DOM 7 |
| State | Redux Toolkit 2, React Redux 9 |
| Styling | TailwindCSS 4, SASS, CSS Modules |
| UI Primitives | Radix UI, Floating UI |
| Rich Text | TipTap 3 (with starter kit + extensions) |
| PDF | pdfjs-dist 5, jsPDF 3, html2canvas |
| Charts | Chart.js 4, Nivo |
| Icons | FontAwesome 6 |
| Local Storage | IndexedDB (via custom wrapper) |
| Hotkeys | react-hotkeys-hook |

---

## Project Structure

```
src/
├── app/
│   ├── components/        # Reusable UI components
│   │   ├── Players/       # AudioPlayer (files) and BrowserPlayer (TTS)
│   │   ├── DocumentReader/# PDF reader with TTS controls and sentence highlighting
│   │   ├── Tiptap/        # Rich text editor templates and extensions
│   │   ├── Modals/        # Logout, page selector, voice selector modals
│   │   ├── Cards/         # Reusable card components (documents, credentials, etc.)
│   │   ├── Buttons/       # Button variants (IconButton, etc.)
│   │   ├── Forms/         # Form components
│   │   ├── Dashboard/     # Dashboard-specific widgets
│   │   ├── Groups/        # User group management components
│   │   └── ...
│   ├── layouts/
│   │   └── DefaultLayout.tsx   # Main layout: TabBar + LateralMenu + content area
│   └── pages/             # Route-level page components
│       ├── Home.tsx
│       ├── DocumentCreate.tsx
│       ├── LocalDocumentReader.tsx
│       ├── Dashboard.tsx
│       ├── Overview.tsx
│       ├── UserGroups.tsx
│       ├── Library.tsx
│       ├── Audios.tsx
│       ├── Storage.tsx
│       ├── Settings.tsx
│       ├── UserCredentials.tsx
│       ├── Appearance.tsx
│       ├── UserArchive.tsx
│       ├── Unauthorized.tsx
│       └── NotFound.tsx
├── store/                 # Redux store and slices
│   ├── index.tsx
│   ├── sessionSlice.ts        # Auth session (logged, userData)
│   ├── pdfReaderSlice.ts      # PDF reader state (pages, sentences, progress)
│   ├── audioPlayerSlice.ts    # Audio file playback
│   ├── browserPlayerSlice.ts  # Browser TTS (Web Speech API)
│   ├── documentSlice.ts       # Loaded document metadata
│   ├── voiceSlice.ts          # Selected TTS voice (persisted to localStorage)
│   ├── credentialsSlice.ts    # TTS provider credentials (async thunks)
│   ├── groupsSlice.ts         # User groups
│   ├── apiResponsesSlice.ts   # Toast notifications
│   └── hooks.ts               # Typed useAppDispatch / useAppSelector
├── services/              # API calls to the backend
│   ├── auth.ts            # fetchAuth, fetchLogout
│   ├── credentials.ts     # CRUD for TTS credentials
│   ├── groups.ts          # User group APIs
│   └── tts.ts             # TTS generation API
├── db/
│   └── index.ts           # IndexedDB operations (documents, progress)
├── config/
│   ├── api.ts             # Environment variable exports
│   └── consts.ts          # Navigation menu configuration
├── context/
│   └── ThemeContext.tsx   # Theme provider (light/dark/system)
├── hooks/
│   └── useInitSession.ts  # Initializes auth session on app load
├── interfaces/
│   └── index.ts           # Shared TypeScript interfaces
├── App.tsx                # Root component with router setup
└── main.tsx               # React DOM entry point
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A running [Spellcast backend](http://localhost:8000) (required for auth and TTS features)

### Installation

```bash
git clone <repo-url>
cd spellcast-client
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_ENV=development
VITE_API_URL=http://localhost:8000
VITE_CLIENT_URL=http://localhost:5174
VITE_ACCOUNT_URL=http://localhost:5173
VITE_REDIRECT_LOGIN_URL=http://localhost:5173/login
VITE_REDIRECT_SIGNUP_URL=http://localhost:5173/register
VITE_CLIENT_NAME="Spellcast"
VITE_APP_ID=<your-app-id>
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_CLIENT_URL` | This client's URL (used for CORS / redirects) |
| `VITE_ACCOUNT_URL` | Auth/account service URL |
| `VITE_REDIRECT_LOGIN_URL` | Redirect target when unauthenticated |
| `VITE_REDIRECT_SIGNUP_URL` | Redirect target for registration |
| `VITE_CLIENT_NAME` | Display name for the application |
| `VITE_APP_ID` | Application identifier for the backend |

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5174`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Authentication

Authentication is session-based using HTTP-only cookies. On app load, `useInitSession` calls the backend to verify the session. Unauthenticated users are redirected to `VITE_REDIRECT_LOGIN_URL`. All API requests use `credentials: 'include'`.

---

## State Management

The Redux store has 9 slices:

| Slice | Responsibility |
|---|---|
| `session` | Logged-in user info and auth loading state |
| `pdfReader` | Document pages, current page, sentence index, continuous playback |
| `document` | Loaded document metadata (title, total pages, file content) |
| `voice` | Selected TTS voice, persisted to `localStorage` |
| `browserPlayer` | Web Speech API state (speaking, playing, volume) |
| `audioPlayer` | Audio file playlist, track index, playback controls |
| `credentials` | TTS provider API keys with async fetch/update thunks |
| `groups` | User group list and membership |
| `apiResponses` | Toast notification queue |

---

## Local Data Persistence

Documents and reading progress are stored in **IndexedDB** (via the custom wrapper in [src/db/index.ts](src/db/index.ts)), so they persist across sessions without a backend. Voice preference and theme are stored in `localStorage`.
