import { faBarsProgress, faBoxesStacked, faCubes, faDiagramProject, faTowerBroadcast, faFileExport, faHeadphones, faImage, faUsers, faVideo, faFingerprint, faShield } from "@fortawesome/free-solid-svg-icons";

export const dashboardDirectoryList = [
  { name: "Overview", icon: faDiagramProject, path: "dashboard/overview" },
  { name: "Members", icon: faUsers, path: "dashboard/members" },
  { name: "Exports", icon: faFileExport, path: "dashboard/exports" },
];

export const storageDirectoryList = [
  { name: "Images", icon: faImage, path: "storage/images" },
  { name: "Audios", icon: faHeadphones, path: "storage/audios" },
  { name: "Videos", icon: faVideo, path: "storage/videos" },
  { name: "3D Models", icon: faCubes, path: "storage/3dmodels" },
];

export const databaseDirectoryList = [
  { name: "Collections", icon: faBoxesStacked, path: "database/collections" },
  { name: "Records", icon: faBarsProgress, path: "database/records" },
  { name: "Connections", icon: faTowerBroadcast, path: "database/connections" },
];

export const settingsDirectoryList = [
  { name: "Credentials", icon: faFingerprint, path: "settings/credentials" },
  { name: "Permissions", icon: faShield, path: "settings/permissions" },
];