export interface userData {
  loader: boolean;
  email?: string;
  id?: string;
  role?: string;
  username?: string;
  profilePic?: string;
  current_credential?: string | null;   // active TTS credential id (from the profile)
}

export type Session = {
  logged: boolean;
  userData: userData;
};

export interface Group {
  id: string;
  name: string;
  member?: Member[]
  isNew?: boolean;
}

export interface TTS_Credential {
  id?: string;
  region: string;
  aws_key?: string | null | undefined;
  gcp_key?: string | null | undefined;
  azure_key?: string | null | undefined;
  isNew?: boolean;
  shared?: boolean;
  voices?: Voice[] | null | undefined;
}

export interface SelectedVoice {
  value: string;
  type: 'ai' | 'browser';
}

export interface Voice {
  value: string;
  name: string;
  gender: string;
  isSelected?: boolean;
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

export interface SpellProgress {
  currentPage: number;
  pagesProgress: number[];
  lastReadSentenceIndex: number;
}

export interface Spell {
  id: string;
  title: string;
  cover?: Blob;
  createdAt: Date;
  userId: string | undefined;
  progress?: SpellProgress;
  pagesContent?: string;
  // The original PDF (if the user chose to keep one) no longer lives here -- it's an
  // ingestion input, not part of the spell's content, and bloated every list/export. See
  // src/db/originalPdfs.ts (TCORE-90). Whether one exists for this spell is looked up there,
  // keyed by `id`, not stored on this record.
  originalPagesContent?: string;
  // TCORE-97: social/feed metadata, all optional -- prefilled from the PDF's own Info/XMP
  // dictionary at import time (see extractPdfMetadata in pdfUtils.ts), always editable.
  description?: string;
  author?: string;
  tags?: string[];
  language?: string;
}

export interface SpellState {
  size: number | null;
  type?: string;
  title: string;
  totalPages: number;
  currentPage: number;
  fileContent: string | null;
  isLoaded: boolean;
}

// Shared across PrimaryButton (and future Button consumers) so risk/emphasis level stays
// consistent app-wide. IconButton's "primary" | "transparent" is a different axis (visual
// treatment, not risk level) and intentionally keeps its own inline union instead.
export type ButtonVariant = 'default' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md';