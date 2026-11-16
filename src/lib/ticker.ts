/**
 * Zamanlayıcıyı Web Worker içinde atar. Sekme arka plandayken tarayıcılar
 * normal setInterval'i yavaşlatır, worker zamanlayıcıları ise yavaşlamaz;
 * böylece süre bittiğinde alarm gecikmeden çalar.
 */
export function startTicker(onTick: () => void, ms = 200): () => void {
  try {
    const url = URL.createObjectURL(
      new Blob([`setInterval(() => postMessage(0), ${ms})`], { type: 'text/javascript' })
    )
    const worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = onTick
    return () => worker.terminate()
  } catch {
    const id = window.setInterval(onTick, ms)
    return () => window.clearInterval(id)
  }
}
