const supported = () => typeof Notification !== 'undefined'

export async function ensureNotifyPermission(): Promise<void> {
  if (!supported() || Notification.permission !== 'default') return
  try {
    await Notification.requestPermission()
  } catch {
    /* kullanıcı reddetti veya tarayıcı desteklemiyor */
  }
}

/** Yalnızca sekme arka plandayken bildirim gösterir. */
export function notify(title: string, body: string): void {
  if (!supported() || Notification.permission !== 'granted' || !document.hidden) return
  try {
    new Notification(title, { body, icon: './icon-192.png', tag: 'pomodoro' })
  } catch {
    /* bazı mobil tarayıcılar doğrudan bildirim oluşturmayı desteklemez */
  }
}
