# Pomodoro — proje notları

Bu dosya Claude Code'un her oturumda okuduğu bağlam dosyasıdır. Projeyi yeni açan
birine (veya yeni bir Claude oturumuna) gerekli olanı anlatır.

## Proje

Özelleştirilebilir pomodoro uygulaması. Arayüz tamamen Türkçe. Vite + React 19 +
TypeScript, PWA (çevrimdışı açılır, "uygulama olarak yükle" destekler).
Hesap/arkadaşlık/sıralama kısmı Supabase ile çalışır ve **isteğe bağlıdır**:
Supabase kurulmazsa uygulama yalnızca yerel olarak sorunsuz çalışır.

## Komutlar

```
npm install
npm run dev        # http://localhost:5173
npm run build
npx tsc --noEmit   # tip kontrolü
```

Bir değişiklik bitmeden önce **her zaman** `npx tsc --noEmit` ve `npm run build`
çalıştır. Mümkünse tarayıcıda da doğrula.

## Klasörler

```
src/App.tsx              Sekmeler, yan paneller, genel durum, oturum kaydı
src/lib/timer.ts         Sayaç mantığı (pomodoro / geri sayım / kronometre)
src/lib/stats.ts         İstatistik, seviye, seri, rozet, hedef hesapları
src/lib/storage.ts       localStorage ile senkron state
src/lib/i18n.ts          TÜM metinler burada (t('key'))
src/lib/account.tsx      Supabase oturumu, profil, şifre işlemleri
src/lib/sync.ts          Seansların buluta eşitlenmesi
src/lib/social.ts        Arkadaşlık ve sıralama çağrıları
src/lib/themes.ts        Hazır arka planlar
src/lib/youtube.ts       YouTube bağlantısı ayrıştırma, gömme adresi
src/components/          Görünümler ve küçük kontroller
supabase/schema.sql      Veritabanı şeması (tablolar, RLS, fonksiyonlar)
supabase/migration-pomodoros.sql   Sonradan eklenen pomodoros sütunu
```

## Kurallar

- **Metin yazma, anahtar ekle.** Arayüzdeki her yazı `src/lib/i18n.ts` içinde
  tanımlanır ve `t('anahtar')` ile kullanılır. JSX içine düz Türkçe metin yazma.
- **Yorumlar Türkçe** ve "ne yaptığını" değil "neden böyle yapıldığını" anlatır.
- Emoji kullanma (varsayılan hedef/ödül metinlerinde bilinçli olarak yok).
- Yeni bir ayar eklerken `Settings` tipine, `DEFAULT_SETTINGS`'e ve ilgili panele
  birlikte ekle; `useLocalStorage` eski kayıtları varsayılanlarla birleştirir.
- Stiller tek dosyada: `src/styles.css`. Renkler CSS değişkenlerinden gelir
  (`--accent`, `--bar`, `--on-accent`).
- Animasyonlar `.app[data-motion]` ile yönetilir ('on' | 'auto' | 'off').

## Önemli tasarım kararları

- **Süre gerçek saatten hesaplanır** (`baseMs` + `startedAt`), sayaç artırarak
  değil. Tik atmak için Web Worker kullanılır (`lib/ticker.ts`); arka plandaki
  sekmede `setInterval` yavaşlar, worker yavaşlamaz.
- **Mod/aşama değiştirince ilerleme silinmez**, `saved` sözlüğünde saklanır ve
  geri dönünce kaldığı yerden devam eder. Üstteki rozet noktaları bunu gösterir.
- **Sayfa yenilenince durum geri yüklenir** (`timerState` anahtarı). Sekme
  kapalıyken geçen süre sayılmaz: son damgadan (10 sn'de bir yazılır) sonrası
  atılır ve sayaç o ana donar.
- **Kronometre ve geri sayımda 20 dakika = 1 pomodoro.** Süre her zaman gerçek
  dakikayla kaydedilir; 20'ye tamamlanmayan artık `pomodoroCarry` içinde birikir
  ve sonraki turda sayılır. Pomodoro modunda her odak aşaması 1 pomodorodur.
- **Tek kayıt en fazla 240 dakika** (veritabanı sınırı). Daha uzun süre parçalara
  bölünerek kaydedilir.
- **Hesap isteğe bağlı.** `src/lib/supabase.ts` ortam değişkenleri yoksa veya
  bozuksa `null` döner; uygulama hesapsız çalışmaya devam eder, çökmez.
- **Hesap değişince yerel kayıt silinmez.** Başka hesapla giriş yapılınca önceki
  sahibin buluta ulaştığı kesin olmayan kayıtları (`syncMark` sonrası) `syncStash`
  içinde sahibine göre bekletilir ve o hesapla tekrar girilince yüklenir.
- **YouTube oynatıcı (`MusicPlayer`) kapatılınca DOM'dan kaldırılmaz**, yalnızca
  gizlenir; iframe kalkarsa müzik kesilir. Durumu `player` anahtarında saklanır.
  Yapıştırılan adres iframe'e doğrudan verilmez: `lib/youtube.ts` yalnızca
  doğrulanmış video/liste kimliğinden `youtube-nocookie.com` adresi kurar.
  Oynat/duraklat komutları YouTube API betiği yüklenmeden `postMessage` ile gider.
- **Genel sıralamada görünmek varsayılan olarak kapalı** (`profiles.is_public`).
- Hafta/ay sınırları Europe/Istanbul saatine göre, hafta pazartesi başlar.
- Veritabanında her tabloda RLS açık; başkalarının verisine yalnızca
  `security definer` fonksiyonlar üzerinden, en az bilgiyle erişilir.

## Supabase

`.env.local` dosyasında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` bulunur
(bu dosya git'e girmez). Kurulum adımları README'deki "Hesap özelliğini kurma"
bölümünde. Şema değişirse `supabase/schema.sql` güncellenmeli ve mevcut
kurulumlar için ayrı bir migration dosyası yazılmalı.

`service_role` / `sb_secret_` anahtarı asla istemci koduna veya `.env.local`
dosyasına konmaz.

## Durum ve sıradaki işler

- Tamamlandı: zamanlayıcı (3 mod), 4 gösterge stili, görünüm/ayar panelleri,
  hedefler-ödüller-seviye-rozetler, takvim ve seri, hesap + arkadaşlık +
  haftalık/aylık sıralama, şifre sıfırlama, PWA, uygulama içi YouTube oynatıcısı.
- **Sıradaki iş: oynatıcıya Spotify desteği.** Google ile giriş kodu hazır;
  Supabase panelinde sağlayıcı açılınca düğme kendiliğinden görünür.
- Açık karar: geri sayım modu pomodoroya çok benziyor. Ya hazır süre düğmeleriyle
  (5/10/15/25/45/60) "hızlı zamanlayıcı" kimliği kazandırılacak ya da kaldırılacak.
- Bilinen sınırlar: kronometre duraklatılmadan sekme kapatılırsa o tur
  kaydedilmez (durum saklanır, dönünce kaydedilir); sayaç tarayıcıda çalıştığı
  için sıralamada hile tamamen engellenemez, veritabanı yalnızca bariz uçlukları
  (gelecek tarih, günde 1440 dakikayı aşan toplam) reddeder.
