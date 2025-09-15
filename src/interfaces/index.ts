import { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface Tab {
  title: string;
  icon?: IconProp;
  route: string;
  showMenu: boolean;
}

export interface userData {
  loader: boolean;
  email?: string;
  id?: string;
  role?: string;
  username?: string;
  profilePic?: string;
}

export type Session = {
  logged: boolean;
  userData: userData
};

export interface TTS_Credential {
  id?: string;
  region: string;
  aws_key?: string | null | undefined;
  gcp_key?: string | null | undefined;
  azure_key?: string | null | undefined;
  isNew?: boolean;
}

export interface Member {
  role: string;
  id: string;
  username: string;
  profilePic?: string;
}

export interface Directory {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Directory[];
}

export interface LabeledSelectProps {
  label: string;
  name: string;
  value: string;
  id: string;
  htmlFor: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface FieldDefinition {
  name: string;
  type: string;
  label: string;
  required?: boolean;
}
