import s from '../../components/EditorSettingsPanel/EditorSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faFloppyDisk, faCode, faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowEditorSettings, setAutoSave } from '../../../store/editorSlice';
import { TabModal } from '../../components/Modals/TabModal';
import { useLanguage } from '../../../i18n';

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

const SavingTab: React.FC = () => {
  const dispatch = useDispatch();
  const { autoSave } = useSelector((state: RootState) => state.editor);
  const [syncCloud, setSyncCloud] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(true);
  const { t } = useLanguage();

  const handleAutoSave = (value: boolean) => {
    dispatch(setAutoSave(value));
    localStorage.setItem('editor:autoSave', String(value));
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.editorSettings.saveMode}</p>
        <ToggleRow label={t.editorSettings.autoSave} description={t.editorSettings.autoSaveDesc} value={autoSave} onChange={handleAutoSave} />
        <ToggleRow soon label={t.editorSettings.saveHistory} description={t.editorSettings.saveHistoryDesc} value={saveHistory} onChange={setSaveHistory} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.editorSettings.cloud}</p>
        <ToggleRow soon label={t.editorSettings.syncToCloud} description={t.editorSettings.syncToCloudDesc} value={syncCloud} onChange={setSyncCloud} />
        <ToggleRow soon label={t.editorSettings.conflictWarnings} description={t.editorSettings.conflictWarningsDesc} value={conflictWarning} onChange={setConflictWarning} />
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
  const { t } = useLanguage();

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.editorSettings.writingAids}</p>
        <ToggleRow soon label={t.editorSettings.spellCheck} description={t.editorSettings.spellCheckDesc} value={spellCheck} onChange={setSpellCheck} />
        <ToggleRow soon label={t.editorSettings.autoFormat} description={t.editorSettings.autoFormatDesc} value={autoFormat} onChange={setAutoFormat} />
        <ToggleRow soon label={t.editorSettings.autoCloseBrackets} description={t.editorSettings.autoCloseBracketsDesc} value={autoCloseBrackets} onChange={setAutoCloseBrackets} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.editorSettings.display}</p>
        <ToggleRow soon label={t.editorSettings.wordCount} description={t.editorSettings.wordCountDesc} value={wordCount} onChange={setWordCount} />
        <ToggleRow soon label={t.editorSettings.lineNumbers} description={t.editorSettings.lineNumbersDesc} value={lineNumbers} onChange={setLineNumbers} />
      </div>
    </div>
  );
};

const ExportTab: React.FC = () => {
  const [includeMeta, setIncludeMeta] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [embedFonts, setEmbedFonts] = useState(true);
  const { t } = useLanguage();

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.editorSettings.exportOptions}</p>
        <ToggleRow soon label={t.editorSettings.includeMeta} description={t.editorSettings.includeMetaDesc} value={includeMeta} onChange={setIncludeMeta} />
        <ToggleRow soon label={t.editorSettings.embedFonts} description={t.editorSettings.embedFontsDesc} value={embedFonts} onChange={setEmbedFonts} />
        <ToggleRow soon label={t.editorSettings.watermark} description={t.editorSettings.watermarkDesc} value={watermark} onChange={setWatermark} />
      </div>
    </div>
  );
};

export const EditorSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showEditorSettings } = useSelector((state: RootState) => state.editor);
  const { t } = useLanguage();

  return (
    <TabModal
      show={showEditorSettings}
      onClose={() => dispatch(setShowEditorSettings(false))}
      title={t.editorSettings.title}
      tabs={[
        { icon: faFloppyDisk,    label: t.editorSettings.savingTab,     content: <SavingTab /> },
        { icon: faCode,          label: t.editorSettings.formattingTab, content: <FormattingTab /> },
        { icon: faFileArrowDown, label: t.editorSettings.exportTab,     content: <ExportTab /> },
      ]}
    />
  );
};
