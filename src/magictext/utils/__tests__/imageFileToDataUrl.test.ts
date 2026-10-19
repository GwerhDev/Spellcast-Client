import { describe, it, expect } from 'vitest'
import { imageFileToDataUrl } from '../imageFileToDataUrl'

describe('imageFileToDataUrl', () => {
  it('keeps an animation, a vector or a WebP as it is', async () => {
    for (const type of ['image/gif', 'image/svg+xml', 'image/webp']) {
      const url = await imageFileToDataUrl(new Blob(['abc'], { type }))
      expect(url.startsWith(`data:${type};base64,`)).toBe(true)
    }
  })

  it("an image it can't re-encode comes back as it is", async () => {
    const url = await imageFileToDataUrl(new Blob(['not an image'], { type: 'image/png' }))
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
  })
})
