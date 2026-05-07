import type { Translations } from '../types'

export const en: Translations = {
  toolbar: { ariaLabel: 'Text formatting' },
  history: { undo: 'Undo', redo: 'Redo' },
  formatting: { bold: 'Bold', italic: 'Italic', underline: 'Underline', strikethrough: 'Strikethrough', highlight: 'Highlight' },
  headings: { heading1: 'Heading 1', heading2: 'Heading 2', heading3: 'Heading 3' },
  blocks: { bulletList: 'Bullet list', orderedList: 'Ordered list', blockquote: 'Blockquote', codeBlock: 'Code block', horizontalRule: 'Horizontal rule' },
  alignment: { alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right' },
  link: { insertLink: 'Insert link', editorAriaLabel: 'Link editor', textLabel: 'Text', textPlaceholder: 'Link text…', urlLabel: 'URL', urlPlaceholder: 'https://…', applyButton: 'Apply', removeLinkButton: 'Remove link' },
  image: { insertImage: 'Insert image', inserterAriaLabel: 'Image inserter', urlTab: 'URL', uploadTab: 'Upload', imageUrlLabel: 'Image URL', urlPlaceholder: 'https://…', altTextLabel: 'Alt text', altTextPlaceholder: 'Image description…', insertButton: 'Insert', dropzoneHint: 'Click or drag an image here' },
  variables: { insertVariable: 'Insert variable', pickerAriaLabel: 'Variable picker', addCustomVariable: '+ Add custom variable…', back: '← Back', backAriaLabel: 'Back to variable list', newVariableTitle: 'New variable', namePlaceholder: 'Variable name…', addButton: 'Add', addOptionButton: '+', addOptionPlaceholder: 'Add option…', removeOption: (option) => `Remove ${option}`, typeLabels: { text: 'Text field', textarea: 'Text area', select: 'Dropdown list', date: 'Date', daterange: 'Date range' } },
  tts: { insertTTS: 'Assign voice', popoverAriaLabel: 'Voice assignment', marksTab: 'Saved marks', assignTab: 'Assign', markLabel: 'Mark', markPlaceholder: 'Mark name…', voiceLabel: 'Voice / model', voiceSelectDefault: 'Select voice…', inflectionLabel: 'Inflection', inflectionSelectDefault: 'Select inflection…', applyButton: 'Apply', playButton: 'Play', stopButton: 'Stop', removeButton: 'Remove mark' },
  variableNode: { fromLabel: 'From', toLabel: 'To', clickToFill: (label) => `Click to fill ${label}`, variableTitle: (label, value) => `${label}: ${value}` },
}
