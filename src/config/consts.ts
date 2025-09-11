import { faDiagramProject, faHeadphones, faUsers, faFingerprint, faShield, faShare, faGear } from "@fortawesome/free-solid-svg-icons";

export const dashboardDirectoryList = [
  { name: "Overview", icon: faDiagramProject, path: "dashboard/overview" },
  { name: "Groups", icon: faUsers, path: "dashboard/groups" },
  { name: "Shared", icon: faShare, path: "dashboard/shared" },
];

export const storageDirectoryList = [
  { name: "Audios", icon: faHeadphones, path: "storage/audios" },
];

export const settingsDirectoryList = [
  { name: "Credentials", icon: faFingerprint, path: "settings/credentials" },
  { name: "Permissions", icon: faShield, path: "settings/permissions" },
];