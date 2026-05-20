import { faUsers, faFingerprint, faShield, faShare, faPalette, faHardDrive, faCloud } from "@fortawesome/free-solid-svg-icons";

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