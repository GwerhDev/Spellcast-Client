import { useMemo } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { TTSSegment } from '../types'
import { extractTTSSegments } from '../utils/extractTTSSegments'

/**
 * Memoized hook that extracts TTS-aware sentence segments from a Tiptap JSONContent page.
 * Re-computes only when `content` reference changes.
 *
 * Returns a flat array of TTSSegment, one per sentence.
 * Each segment carries the TTS attrs (voice, characterId, etc.) assigned in the editor,
 * or null if the sentence has no voice mark.
 */
export function useTTSSegments(content: JSONContent | null | undefined): TTSSegment[] {
  return useMemo(() => {
    if (!content) return []
    return extractTTSSegments(content)
  }, [content])
}
