import {
  faUsers, faFingerprint, faShield, faShare, faPalette, faHardDrive, faCloud,
  faHome, faBuildingColumns, faFeatherPointed, faStore, faUser, faBox, faGear,
  faList, faPlus,
} from "@fortawesome/free-solid-svg-icons";

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
