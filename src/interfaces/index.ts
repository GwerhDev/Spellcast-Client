import { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface Tab {
  title: string;
  icon?: IconProp;
  route: string;
}

export interface userData {
  loader: boolean;
  id?: string;
  role?: string;
  username?: string;
  profilePic?: string;
}

export type Session = {
  logged: boolean;
  userData: userData
};

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

export interface LabeledInputProps {
  label: string;
  name: string;
  value: string;
  type: string;
  placeholder: string;
  id: string;
  htmlFor: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export interface FieldDefinition {
  name: string;
  type: string;
  label: string;
  required?: boolean;
}
