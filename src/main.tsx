import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/fraunces/wght-italic.css'
import App from './App'
import { AccountProvider } from './lib/account'
import './styles.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <AccountProvider>
    <App />
  </AccountProvider>
)

// Üretim sürümünde çevrimdışı çalışma ve "uygulama olarak yükle" desteği
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
  })
}
