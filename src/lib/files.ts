/** Seçilen resmi en fazla `maxW` genişliğe küçültüp JPEG data URL'ine çevirir. */
export async function imageToDataUrl(file: File, maxW = 1920): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bmp.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const g = canvas.getContext('2d')
  if (!g) throw new Error('Canvas kullanılamıyor')
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
