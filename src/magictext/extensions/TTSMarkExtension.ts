import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * Tiptap mark that tags a text range with TTS metadata.
 * Attributes are stored as data-* HTML attributes and round-trip through
 * Tiptap's JSON serialization.
 *
 * Output HTML:
 *   <span data-type="tts" data-character-id="alice" data-character-name="Alice"
 *         data-voice="en-us-female" data-inflection="excited" data-color="#10b981">...</span>
 */
export const TTSMarkExtension = Mark.create({
  name: 'tts',
  inclusive: false,

  addAttributes() {
    return {
      characterId: {
        default: null,
        parseHTML: el => el.getAttribute('data-character-id'),
        renderHTML: attrs => attrs.characterId ? { 'data-character-id': attrs.characterId } : {},
      },
      characterName: {
        default: null,
        parseHTML: el => el.getAttribute('data-character-name'),
        renderHTML: attrs => attrs.characterName ? { 'data-character-name': attrs.characterName } : {},
      },
      voice: {
        default: null,
        parseHTML: el => el.getAttribute('data-voice'),
        renderHTML: attrs => attrs.voice ? { 'data-voice': attrs.voice } : {},
      },
      inflection: {
        default: null,
        parseHTML: el => el.getAttribute('data-inflection'),
        renderHTML: attrs => attrs.inflection ? { 'data-inflection': attrs.inflection } : {},
      },
      color: {
        default: null,
        parseHTML: el => el.getAttribute('data-color'),
        renderHTML: attrs => attrs.color ? { 'data-color': attrs.color } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tts"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-color'] as string | undefined
    return [
      'span',
      mergeAttributes(
        {
          'data-type': 'tts',
          class: 'magic-text-editor__tts',
          ...(color ? { style: `--tts-color: ${color};` } : {}),
        },
        HTMLAttributes,
      ),
    ]
  },
})
