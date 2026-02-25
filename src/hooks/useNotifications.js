import { useEffect, useState } from 'react'

const STORAGE_KEY = 'fitmentor_notif_settings'

const DEFAULT_SETTINGS = {
  enabled: false,
  morningHour: 7,
  morningMinute: 0,
  eveningHour: 21,
  eveningMinute: 0,
}

// Service Worker 経由で通知をスケジュール（バックグラウンド対応）
function scheduleViaSW(title, body, delayMs, url = '/dashboard') {
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) {
      reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', title, body, delayMs, url })
    }
  })
}

export function useNotifications(hasRecordedToday = false) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  // 通知許可をリクエスト
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  // 設定保存
  const saveSettings = (newSettings) => {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return merged
  }

  // 通知オン/オフ切り替え
  const toggleNotifications = async () => {
    if (!settings.enabled) {
      const perm = await requestPermission()
      if (perm !== 'granted') return false
      saveSettings({ enabled: true })
      return true
    } else {
      saveSettings({ enabled: false })
      return false
    }
  }

  // 特定の時刻までの遅延(ms)を計算
  const msUntil = (hour, minute) => {
    const now = new Date()
    const target = new Date()
    target.setHours(hour, minute, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    return target.getTime() - now.getTime()
  }

  // リマインダーをスケジュール
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return
    if (!('serviceWorker' in navigator)) return

    if (!hasRecordedToday) {
      // 朝リマインダー → SW経由でスケジュール
      scheduleViaSW(
        '🌅 おはようございます！',
        '今日の朝の体重をFitMentorに記録しよう💪',
        msUntil(settings.morningHour, settings.morningMinute),
        '/record'
      )
      // 夜リマインダー → SW経由でスケジュール
      scheduleViaSW(
        '🌙 今日の記録は済んでる？',
        '体重・食事を記録してストリークを守ろう！🔥',
        msUntil(settings.eveningHour, settings.eveningMinute),
        '/record'
      )
    }
  }, [settings.enabled, permission, hasRecordedToday, settings.morningHour, settings.eveningHour])

  return {
    permission,
    settings,
    saveSettings,
    toggleNotifications,
    isSupported: typeof Notification !== 'undefined' && 'serviceWorker' in navigator,
  }
}
