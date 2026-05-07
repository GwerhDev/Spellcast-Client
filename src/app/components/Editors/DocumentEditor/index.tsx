import s from './index.module.css';
import React, { useState, useEffect } from 'react';
import { MagicTextEditor } from '../../../../magictext';
import type { JSONContent, TTSMark, TTSPlayPayload } from '../../../../magictext';

interface DocumentEditorProps {
  pageNumber: number;
  pageContent: JSONContent;
  onPageContentChange: (newContent: JSONContent) => void;
  ttsMarks?: TTSMark[];
  ttsInflections?: string[];
  onTTSPlay?: (payload: TTSPlayPayload) => void;
  onTTSStop?: () => void;
  ttsPlaying?: boolean;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  pageNumber,
  pageContent,
  onPageContentChange,
  ttsMarks,
  ttsInflections,
  onTTSPlay,
  onTTSStop,
  ttsPlaying,
}) => {
  const [content, setContent] = useState<JSONContent>(pageContent);

  useEffect(() => {
    setContent(pageContent);
  }, [pageContent, pageNumber]);

  return (
    <div className={s.root}>
      <MagicTextEditor
        inputType="json"
        outputType="json"
        content={content}
        onChange={(newContent) => {
          const json = newContent as JSONContent;
          setContent(json);
          onPageContentChange(json);
        }}
        editable
        ttsMarks={ttsMarks}
        ttsInflections={ttsInflections}
        onTTSPlay={onTTSPlay}
        onTTSStop={onTTSStop}
        ttsPlaying={ttsPlaying}
        wrapContent={(editorContent) => (
          <div className={s.paperBackground}>
            <div className={s.paperSheet}>
              {editorContent}
            </div>
          </div>
        )}
      />
    </div>
  );
};
