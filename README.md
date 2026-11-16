# Pomodoro

Tarayıcıda çalışan, özelleştirilebilir pomodoro uygulaması (Vite + React + TypeScript).
İstersen Chrome veya Edge'den "uygulama olarak yükle" diyerek masaüstü uygulaması gibi kullanabilirsin.

## Çalıştırma

Gereken: Node.js 22 veya üstü (https://nodejs.org).

```
npm install
npm run dev
```

Sonra tarayıcıda http://localhost:5173 adresini aç.

## Yayınlama

```
npm run build
```

`dist` klasörü oluşur. İçindekileri herhangi bir statik barındırmaya (GitHub Pages, Netlify, Vercel...)
yüklemen yeterli. Yayınlanan sürüm çevrimdışı da açılır ve "yükle" seçeneği sunar.

## Özellikler

- Sayaç modları: Pomodoro (odak, kısa mola, uzun mola), geri sayım, kronometre
- Zaman göstergeleri: Kadran, dijital, çubuk, sade
- Görünüm menüsü: gösterge stili, süre çubuğu rengi, arka plan (hazır, düz renk, kendi resmin), karartma, vurgu rengi, motivasyon sözleri
- Ayarlar menüsü: süreler, otomatik başlatma, bildirim, bitiş sesi
- Hedefler, ödüller, seviye, seri ve rozetler
- Sekme arka plandayken bile süre doğru işler; bitince ses çalar ve (izin verirsen) bildirim gelir
- Sayfayı yenilesen bile sayaç kaldığı yerden devam eder; sekme kapalıyken geçen süre sayılmaz
- Kronometre ve geri sayımda 20 dakika odak = 1 pomodoro; artan dakikalar kaybolmaz, sonraki turlarda birikir

- Türkçe ve İngilizce arayüz: Ayarlar → Dil. Varsayılan olarak tarayıcının dilini izler
- Müzik: üstteki nota simgesinden bir YouTube video veya oynatma listesi bağlantısı yapıştır; köşedeki oynatıcı paneli kapatsan da çalmaya devam eder. İstersen odak başlayınca oynatıp molada duraklatır
- İsteğe bağlı hesap: e-posta/şifre veya Google ile giriş, kullanıcı adıyla arkadaş ekleme (istek kabul edilince arkadaşlık kurulur), haftalık/aylık sıralama (arkadaşlar arasında ve genel)

Hesap açmazsan her şey eskisi gibi yalnızca bu tarayıcıda çalışır: ayarlar, hedefler ve geçmiş `localStorage` alanında saklanır. Hesap açınca yalnızca odak seansların buluta eşitlenir (ayarlar ve hedefler cihazda kalır).

## Hesap özelliğini kurma (Supabase)

Hesap, arkadaşlık ve sıralama için ücretsiz bir Supabase projesi gerekir. Kurulmazsa uygulama hesapsız çalışır ve Sıralama sekmesi bunu söyler.

1. [supabase.com](https://supabase.com) üzerinde hesap aç ve **New project** ile proje oluştur.
2. Projede **SQL Editor** aç, `supabase/schema.sql` dosyasının tamamını yapıştırıp **Run** de (bir kez yeterli).
3. **Project Settings → API** sayfasından iki değeri al: **Project URL** ve **anon / publishable key**. `service_role` anahtarını asla kullanma ve paylaşma.
4. Proje klasöründe `.env.example` dosyasını `.env.local` olarak kopyala ve değerleri yaz:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Uygulamayı yeniden başlat (`npm run dev`). Üstteki kişi simgesinden kaydol.
6. **Authentication → URL Configuration** bölümünde **Site URL** ve **Redirect URLs** listesine uygulamanın adresini ekle (örn. `http://localhost:5173`, yayınlarsan canlı adresin). Aksi halde e-posta onayı ve Google girişi başarısız olur.

E-posta onayı: Supabase varsayılan olarak kayıtta onay e-postası gönderir; ücretsiz planda saatlik e-posta sayısı sınırlıdır. Denerken **Authentication → Providers → Email** altında "Confirm email" seçeneğini kapatabilirsin.

### Google ile giriş (isteğe bağlı)

"Google ile devam et" düğmesi yalnızca Supabase'te Google sağlayıcısı açıkken görünür.

1. Supabase'te **Authentication → Providers → Google** sayfasını aç ve oradaki **Callback URL** değerini kopyala (`https://xxxx.supabase.co/auth/v1/callback` biçiminde).
2. [Google Cloud Console](https://console.cloud.google.com) üzerinde bir proje seç veya oluştur.
3. **APIs & Services → OAuth consent screen**: uygulama türü **External**, uygulama adı ve destek e-postasını gir. Yayına almadan önce yalnızca **Test users** listesine eklediğin hesaplar giriş yapabilir.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**: tür **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:5173` ve yayınlarsan canlı adresin.
   - **Authorized redirect URIs**: 1. adımda kopyaladığın Supabase callback adresi.
5. Oluşan **Client ID** ve **Client Secret** değerlerini Supabase'teki Google sayfasına yapıştır, sağlayıcıyı aç ve kaydet. Secret yalnızca Supabase paneline girilir; `.env.local` dosyasına veya koda yazılmaz.
6. 6. adımdaki **Redirect URLs** listesinde uygulamanın adresi olduğundan emin ol, sonra sayfayı yenile.

Google ile ilk kez girenlerden de kullanıcı adı seçmeleri istenir. Aynı e-postayla daha önce şifreyle kayıt olunduysa Supabase iki girişi aynı hesapta birleştirir.

Şifre sıfırlama: Giriş ekranındaki "Şifremi unuttum" bağlantısı e-posta gönderir; bağlantıya tıklayınca uygulama yeni şifre sorar. Bunun çalışması için 6. adımdaki yönlendirme adresleri doğru olmalı.

Bilmen gerekenler:
- Kronometre ve geri sayımda 20 dakika odak = 1 pomodoro sayılır (süre dakikaya tam yazılır). Şemayı bu kuraldan önce kurduysan `supabase/migration-pomodoros.sql` dosyasını SQL Editor'de bir kez çalıştır. Çalıştırmazsan uygulama pomodoro sütunu olmadan eşitlemeye devam eder.
- Genel sıralamada görünmek varsayılan olarak **kapalıdır**; Hesap panelinden açılır. Kapalıyken yalnızca arkadaşların seni görür.
- Hafta pazartesi başlar; hafta ve ay sınırları Türkiye saatine göre hesaplanır.
- Süre sayacı tarayıcıda çalıştığı için hile tamamen engellenemez. Veritabanı yalnızca bariz uçlukları reddeder (gelecek tarihli kayıt, bir güne sığmayan toplam süre).
- Sekme kapalıyken geçen süre sayılmaz: çalışan sayaç, sekme kapanmadan önceki son ana donar.
- Bu tarayıcıda başka bir hesapla giriş yaparsan önceki hesabın yerel kayıtları yeni hesaba yüklenmez; yerine yeni hesabın buluttaki kayıtları gelir. Önceki hesabın henüz buluta ulaşmamış kayıtları silinmez, o hesapla tekrar girince yüklenir.

## Klasör yapısı

```
index.html, vite.config.ts
supabase/schema.sql        Hesap, arkadaşlık ve sıralama için veritabanı şeması
public/                    Simgeler, manifest, service worker
src/
  App.tsx                  Sekmeler, yan menüler, genel durum
  components/              TimerView, TimerDisplay, SettingsView, AppearanceView, GoalsView,
                           CalendarView, SocialView (sıralama, arkadaşlar), AccountView,
                           MusicPlayer (YouTube oynatıcı)
  lib/account.tsx          Giriş, kayıt, profil
  lib/sync.ts              Seansları buluta eşitleme
  lib/social.ts            Arkadaşlık ve sıralama çağrıları
  lib/timer.ts             Sayaç mantığı
  lib/ticker.ts            Arka planda yavaşlamayan zamanlayıcı (Web Worker)
  lib/stats.ts             İstatistik, seviye, rozet, hedef hesapları
  lib/quotes.ts            Motivasyon sözleri
  lib/i18n.ts              Tüm arayüz metinleri (Türkçe ve İngilizce)
  lib/sound.ts             Bitiş sesleri
  lib/youtube.ts           YouTube bağlantısını ayrıştırma ve gömme adresi
  lib/themes.ts            Hazır arka planlar
```

## Sıradaki adımlar

- Uygulama içi oynatıcıya Spotify desteği
