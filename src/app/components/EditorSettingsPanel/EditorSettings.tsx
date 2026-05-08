import s from './EditorSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faFloppyDisk, faCode, faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowEditorSettings, setAutoSave } from '../../../store/editorSlice';
import { TabModal } from '../Modals/TabModal';

/* ── shared primitives ──────────────────────────────────── */

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, soon }) => (
  <div className={`${s.row} ${soon ? s.rowSoon : ''}`}>
    <div className={s.rowText}>
      <div className={s.rowLabelRow}>
        <span className={s.rowLabel}>{label}</span>
        {soon && <span className={s.soonTag}>soon</span>}
      </div>
      <span className={s.rowDesc}>{description}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${s.toggle} ${value ? s.toggleOn : ''}`}
      onClick={() => !soon && onChange(!value)}
      tabIndex={soon ? -1 : 0}
    >
      <span className={`${s.toggleThumb} ${value ? s.toggleThumbOn : ''}`} />
    </button>
  </div>
);

/* ── tab content components ─────────────────────────────── */

const SavingTab: React.FC = () => {
  const dispatch = useDispatch();
  const { autoSave } = useSelector((state: RootState) => state.editor);
  const [syncCloud, setSyncCloud] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(true);

  const handleAutoSave = (value: boolean) => {
    dispatch(setAutoSave(value));
    localStorage.setItem('editor:autoSave', String(value));
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>Save mode</p>
        <ToggleRow label="Auto save" description="Automatically save changes as you type." value={autoSave} onChange={handleAutoSave} />
        <ToggleRow soon label="Save history" description="Keep a version history of your document changes." value={saveHistory} onChange={setSaveHistory} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>Cloud</p>
        <ToggleRow soon label="Sync to cloud" description="Automatically sync your documents to the cloud." value={syncCloud} onChange={setSyncCloud} />
        <ToggleRow soon label="Conflict warnings" description="Warn when a document has been modified elsewhere." value={conflictWarning} onChange={setConflictWarning} />
      </div>
    </div>
  );
};

const FormattingTab: React.FC = () => {
  const [spellCheck, setSpellCheck] = useState(true);
  const [autoFormat, setAutoFormat] = useState(false);
  const [wordCount, setWordCount] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(false);
  const [autoCloseBrackets, setAutoCloseBrackets] = useState(true);

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>Writing aids</p>
        <ToggleRow soon label="Spell check" description="Highlight spelling errors while typing." value={spellCheck} onChange={setSpellCheck} />
        <ToggleRow soon label="Auto format on save" description="Automatically format the document when saving." value={autoFormat} onChange={setAutoFormat} />
        <ToggleRow soon label="Auto close brackets" description="Automatically insert closing brackets and quotes." value={autoCloseBrackets} onChange={setAutoCloseBrackets} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>Display</p>
        <ToggleRow soon label="Show word count" description="Display a live word and character count." value={wordCount} onChange={setWordCount} />
        <ToggleRow soon label="Line numbers" description="Show line numbers in the editor gutter." value={lineNumbers} onChange={setLineNumbers} />
      </div>
    </div>
  );
};

const ExportTab: React.FC = () => {
  const [includeMeta, setIncludeMeta] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [embedFonts, setEmbedFonts] = useState(true);

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>Export options</p>
        <ToggleRow soon label="Include metadata" description="Embed title, author and date in the exported file." value={includeMeta} onChange={setIncludeMeta} />
        <ToggleRow soon label="Embed fonts" description="Bundle custom fonts inside the exported document." value={embedFonts} onChange={setEmbedFonts} />
        <ToggleRow soon label="Add watermark" description="Stamp a watermark on every page of the export." value={watermark} onChange={setWatermark} />
      </div>
    </div>
  );
};

/* ── main component ─────────────────────────────────────── */

export const EditorSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showEditorSettings } = useSelector((state: RootState) => state.editor);

  return (
    <TabModal
      show={showEditorSettings}
      onClose={() => dispatch(setShowEditorSettings(false))}
      title="Editor Settings"
      tabs={[
        { icon: faFloppyDisk,    label: 'Saving',     content: <SavingTab /> },
        { icon: faCode,          label: 'Formatting', content: <FormattingTab /> },
        { icon: faFileArrowDown, label: 'Export',     content: <ExportTab /> },
      ]}
    />
  );
};
