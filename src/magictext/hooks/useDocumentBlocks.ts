import { useMemo } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { DocumentBlock } from '../types'
import { extractDocumentBlocks } from '../utils/extractTTSSegments'

/**
 * Memoized hook returning the ordered document blocks (text + image + rule) for a
 * Tiptap JSONContent page, for use by the read-only TTSDocumentReader renderer.
 * Re-computes only when `content` reference changes.
 */
export function useDocumentBlocks(content: JSONContent | null | undefined): DocumentBlock[] {
  return useMemo(() => extractDocumentBlocks(content), [content])
}
