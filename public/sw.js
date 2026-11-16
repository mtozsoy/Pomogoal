// Uygulama kabuğunu önbelleğe alır; internet olmasa da açılır.
const CACHE = 'pomodoro-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  // Önce ağ, olmazsa önbellek: güncelleme geldiğinde hemen görünür
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Yalnızca başarılı ve tam yanıtlar önbelleğe alınır
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined)
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
  )
})
