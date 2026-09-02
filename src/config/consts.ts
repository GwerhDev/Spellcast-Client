import {
  faUsers, faFingerprint, faShield, faPalette, faHardDrive, faCloud,
  faHome, faBuildingColumns, faFeatherPointed, faStore, faUser, faBox, faGear,
  faList, faPlus, faIdBadge, faChartLine, faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";

// Silent, single-cycle WAV looped by both BrowserPlayer and AudioPlayer as a
// real, always-audible HTMLMediaElement anchor: Chromium doesn't reliably
// adopt a page's own navigator.mediaSession (metadata + action handlers) as
// the OS-facing widget until SOME real <audio>/<video> element on the page is
// genuinely playing. speechSynthesis alone isn't an HTMLMediaElement, and AI
// audio synthesis has a real network/synthesis round-trip before its own
// <audio> element starts playing -- during that window nothing was actually
// "playing" from the browser's point of view, so the OS widget wouldn't sync
// with metadata we'd already set correctly (observed: title/artist staying
// blank in the widget until the next interaction). This anchor removes that
// window entirely by giving the browser something real to play the instant
// playback is intended, independent of whether the real content is ready yet.
export const SILENT_AUDIO_SRC = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

export const dashboardDirectoryList = [
  { name: "Stats", icon: faChartLine, path: "stats" },
  // TCORE-109: possession + equip surface (unlockedIds + the same setActiveXxx actions
  // ReaderSettings/PlayerPreferences already dispatch) -- Havenstore stays acquisition-only.
  { name: "Inventory", icon: faBoxOpen, path: "inventory" },
  { name: "Groups", icon: faUsers, path: "groups" },
];

export const storageDirectoryList = [
  { name: "Local", icon: faHardDrive, path: "storage/local" },
  { name: "Cloud", icon: faCloud,    path: "storage/cloud" },
];

// TCORE-109 (reverted): Storage lives inside Settings now, one flat item alongside
// Credentials/Permissions/Appearance -- same shape as those three (a single item, a single
// subroute), not its own nested sub-accordion. Local/Cloud stay reachable the way they
// already were, one click further in, via Storage's own StorageOverview cards.
export const settingsDirectoryList = [
  { name: "Credentials", icon: faFingerprint, path: "settings/credentials" },
  { name: "Permissions", icon: faShield, path: "settings/permissions" },
  { name: "Appearance", icon: faPalette, path: "settings/appearance" },
  { name: "Storage", icon: faBox, path: "settings/storage" },
];

export const editorDirectoryList = [
  { name: "Select", icon: faList, path: "editor/select" },
  { name: "Create", icon: faPlus, path: "editor/create" },
];

// Sections with no sub-items — rendered as single-click rows/icons in both sidebar states.
export const sidebarDirectLinks = [
  { key: "home", icon: faHome, path: "/" },
  { key: "grimoire", icon: faBuildingColumns, path: "/grimoire" },
  { key: "havenstore", icon: faStore, path: "/havenstore" },
];

export interface SidebarAccordionSectionConfig {
  key: string;
  icon: typeof faUser;
  path: string;
  items: { name: string; icon: typeof faUser; path: string }[];
  basePath: string;
  subSections: SidebarAccordionSectionConfig[];
}

// Sub-sections nested one level under "caster" — each has its own sub-items, rendered as
// a nested accordion within the "caster" section body. Also reachable as tabs from
// CasterLayout, the shared header+tabs shell every /caster/* route renders under.
export const userSubSections: SidebarAccordionSectionConfig[] = [
  { key: "settings", icon: faGear, path: "/caster/settings", items: settingsDirectoryList, basePath: "/caster/", subSections: [] },
];

// Top-level sections with sub-items — rendered as accordions in the expanded panel,
// icon-only in the collapsed rail. basePath is prefixed to each item's relative `path` to
// build its route. "caster" nests settings as a sub-section (see userSubSections) alongside
// its own direct items (dashboardDirectoryList) -- its own path points at the Caster
// profile page (TCORE-107 follow-up), the default landing for "Caster". All of these
// destinations are mirrored flat in `casterTabs` below, which CasterLayout renders as a tab
// bar atop every /caster/* route.
export const sidebarAccordionSections: SidebarAccordionSectionConfig[] = [
  { key: "editor", icon: faFeatherPointed, path: "/editor", items: editorDirectoryList, basePath: "/", subSections: [] },
  { key: "caster", icon: faUser, path: "/caster/profile", items: dashboardDirectoryList, basePath: "/caster/", subSections: userSubSections },
];

// Flat mirror of the sidebar's Caster section (Profile + Stats/Inventory/Groups items +
// Settings sub-section, all flattened to one level) -- the tab bar CasterLayout renders atop
// every /caster/* route. Labels are resolved from `t.nav[id]` at render time, same lookup
// the sidebar itself uses, so the two can never show mismatched text.
export const casterTabs = [
  { id: "profile", icon: faIdBadge, path: "/caster/profile" },
  { id: "stats", icon: faChartLine, path: "/caster/stats" },
  { id: "inventory", icon: faBoxOpen, path: "/caster/inventory" },
  { id: "groups", icon: faUsers, path: "/caster/groups" },
  { id: "settings", icon: faGear, path: "/caster/settings" },
];
