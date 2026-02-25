// FitMentor Service Worker
const CACHE_NAME = 'fitmentor-v1'

// キャッシュするアセット（オフライン対応）
const STATIC_ASSETS = ['/', '/dashboard', '/record', '/settings']

// ── インストール ──
self.addEventListener('install', event => {
  self.skipWaiting()
})

// ── アクティベート ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── フェッチ（ネットワーク優先、失敗時にキャッシュ） ──
self.addEventListener('fetch', event => {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('supabase') ||
      event.request.url.includes('openai')) return

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // GETリクエストのみキャッシュ
        if (event.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

// ── Push通知受信 ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'FitMentor'
  const body  = data.body  ?? '今日の記録を入力しよう！'
  const icon  = data.icon  ?? '/icons/icon-192.png'
  const url   = data.url   ?? '/dashboard'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

// ── 通知タップ → アプリを開く ──
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(url)
      } else {
        clients.openWindow(url)
      }
    })
  )
})

// ── スケジュール通知（アプリ起動中にセット） ──
// メインスレッドから postMessage で呼び出す
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs, url } = event.data
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: url ?? '/dashboard' },
        vibrate: [200, 100, 200],
      })
    }, delayMs ?? 0)
  }
})
