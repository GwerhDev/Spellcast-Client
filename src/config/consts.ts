import {
  faUsers, faFingerprint, faShield, faShare, faPalette, faHardDrive, faCloud,
  faHome, faBuildingColumns, faFeatherPointed, faStore, faUser, faBox, faGear,
  faList, faPlus,
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
  { name: "Groups", icon: faUsers, path: "dashboard/groups" },
  { name: "Shared", icon: faShare, path: "dashboard/shared" },
];

export const storageDirectoryList = [
  { name: "Local", icon: faHardDrive, path: "storage/local" },
  { name: "Cloud", icon: faCloud,    path: "storage/cloud" },
];

export const settingsDirectoryList = [
  { name: "Credentials", icon: faFingerprint, path: "settings/credentials" },
  { name: "Permissions", icon: faShield, path: "settings/permissions" },
  { name: "Appearance", icon: faPalette, path: "settings/appearance" },
];

export const editorDirectoryList = [
  { name: "Select", icon: faList, path: "editor/select" },
  { name: "Create", icon: faPlus, path: "editor/create" },
];

// Sections with no sub-items — rendered as single-click rows/icons in both sidebar states.
export const sidebarDirectLinks = [
  { key: "home", icon: faHome, path: "/" },
  { key: "library", icon: faBuildingColumns, path: "/library" },
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

// Sub-sections nested one level under "user" — each has its own sub-items, rendered as a
// nested accordion within the "user" section body.
export const userSubSections: SidebarAccordionSectionConfig[] = [
  { key: "storage", icon: faBox, path: "/user/storage", items: storageDirectoryList, basePath: "/user/", subSections: [] },
  { key: "settings", icon: faGear, path: "/user/settings", items: settingsDirectoryList, basePath: "/user/", subSections: [] },
];

// Top-level sections with sub-items — rendered as accordions in the expanded panel,
// icon-only in the collapsed rail. basePath is prefixed to each item's relative `path` to
// build its route. "user" nests storage/settings as sub-sections (see userSubSections)
// alongside its own direct items (dashboardDirectoryList).
export const sidebarAccordionSections: SidebarAccordionSectionConfig[] = [
  { key: "editor", icon: faFeatherPointed, path: "/editor", items: editorDirectoryList, basePath: "/", subSections: [] },
  { key: "user", icon: faUser, path: "/user/dashboard", items: dashboardDirectoryList, basePath: "/user/", subSections: userSubSections },
];
