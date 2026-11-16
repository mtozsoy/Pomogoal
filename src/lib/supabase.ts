import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Adresi hoşgörülü okur: Supabase panelindeki "API URL" değeri `/rest/v1/` ile
 * biter, kopyala-yapıştırda tırnak veya boşluk da gelebilir. Burada temizlenir.
 */
function cleanUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/\/auth\/v1$/, '')
}

const url = cleanUrl((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '')
const key = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '')
  .trim()
  .replace(/^["']|["']$/g, '')

let client: SupabaseClient | null = null
/** Değerler yazılmış ama geçersiz: kullanıcıya ayrı bir mesaj gösterilir. */
let badConfig = false

if (url || key) {
  try {
    client = createClient(url, key)
  } catch (err) {
    badConfig = true
    // Hatalı adres yüzünden uygulamanın tamamen açılmaması yerine hesapsız devam eder
    console.warn('Supabase ayarları okunamadı; uygulama hesapsız çalışacak.', err)
  }
}

/**
 * Supabase panelinde Google sağlayıcısı açık mı? Kapalıyken giriş denemesi
 * kullanıcıyı ham bir JSON hata sayfasına götürdüğü için düğme önceden gizlenir.
 * Öğrenilemezse (çevrimdışı vb.) false: Google girişi zaten ağ ister.
 */
export async function fetchGoogleEnabled(): Promise<boolean> {
  if (!client) return false
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    if (!res.ok) return false
    const data = (await res.json()) as { external?: { google?: boolean } }
    return data.external?.google === true
  } catch {
    return false
  }
}

/** Ortam değişkenleri yoksa null: uygulama hesapsız (yalnızca yerel) çalışır. */
export const supabase = client
export const accountsEnabled = client !== null
export const accountsMisconfigured = badConfig
