export type PartialTranslations = {
  toolbar?: Partial<Translations['toolbar']>
  history?: Partial<Translations['history']>
  formatting?: Partial<Translations['formatting']>
  headings?: Partial<Translations['headings']>
  blocks?: Partial<Translations['blocks']>
  alignment?: Partial<Translations['alignment']>
  link?: Partial<Translations['link']>
  image?: Partial<Translations['image']>
  tts?: Partial<Translations['tts']>
  variables?: Partial<Omit<Translations['variables'], 'typeLabels'>> & {
    typeLabels?: Partial<Translations['variables']['typeLabels']>
  }
  variableNode?: Partial<Translations['variableNode']>
}

export interface Translations {
  toolbar: { ariaLabel: string }
  history: { undo: string; redo: string }
  formatting: { bold: string; italic: string; underline: string; strikethrough: string; highlight: string }
  headings: { heading1: string; heading2: string; heading3: string }
  blocks: { bulletList: string; orderedList: string; blockquote: string; codeBlock: string; horizontalRule: string }
  alignment: { alignLeft: string; alignCenter: string; alignRight: string }
  link: { insertLink: string; editorAriaLabel: string; textLabel: string; textPlaceholder: string; urlLabel: string; urlPlaceholder: string; applyButton: string; removeLinkButton: string }
  image: { insertImage: string; inserterAriaLabel: string; urlTab: string; uploadTab: string; imageUrlLabel: string; urlPlaceholder: string; altTextLabel: string; altTextPlaceholder: string; insertButton: string; dropzoneHint: string }
  variables: { insertVariable: string; pickerAriaLabel: string; addCustomVariable: string; back: string; backAriaLabel: string; newVariableTitle: string; namePlaceholder: string; addButton: string; addOptionButton: string; addOptionPlaceholder: string; removeOption: (option: string) => string; typeLabels: { text: string; textarea: string; select: string; date: string; daterange: string } }
  tts: { insertTTS: string; popoverAriaLabel: string; marksTab: string; assignTab: string; markLabel: string; markPlaceholder: string; voiceLabel: string; voiceSelectDefault: string; inflectionLabel: string; inflectionSelectDefault: string; applyButton: string; playButton: string; stopButton: string; removeButton: string }
  variableNode: { fromLabel: string; toLabel: string; clickToFill: (label: string) => string; variableTitle: (label: string, value: string) => string }
}
