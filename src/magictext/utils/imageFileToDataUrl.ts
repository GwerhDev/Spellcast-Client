const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// Kept as they are: an animation (GIF), a vector (SVG), or already WebP.
const KEPT_AS_IS = ['image/gif', 'image/svg+xml', 'image/webp']

// An image picked to insert into a page, as the data URL the page stores: re-encoded as WebP
// (lighter at the same look; the page is stored and shared with it). Where it can't be
// (a browser without WebP encoding, an image it can't decode), the file as it is.
export const imageFileToDataUrl = async (file: Blob, quality = 0.85): Promise<string> => {
  if (KEPT_AS_IS.includes(file.type)) return readAsDataUrl(file)
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    bitmap.close()
    const webp = canvas.toDataURL('image/webp', quality)
    return webp.startsWith('data:image/webp') ? webp : readAsDataUrl(file)
  } catch {
    return readAsDataUrl(file)
  }
}
