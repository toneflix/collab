import type { Router } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { PushNotifications, type Channel } from '@capacitor/push-notifications'
import { AuthSession } from 'src/utils/auth-session'
import type { PushDevice, PushPermission } from 'src/utils/push'
import {
  deleteDeviceTokenRequest,
  saveDeviceTokenRequest,
  type NotificationSettings,
} from 'src/utils/requests/notifications'

/**
 * Push for the installed app through Firebase Cloud Messaging. Android shows
 * these in the system tray even when the app is closed.
 */
export class NativePush implements PushDevice {
  readonly name = 'this device'

  static readonly tokenKey = 'push.native.token'

  /** Asked once on first sign-in; later changes go through the settings page. */
  static readonly askedKey = 'push.native.asked'

  /** Set when push was turned off on the settings page, so launches don't turn it back on. */
  static readonly offKey = 'push.native.off'

  /** One Android channel per notification category, so people can mute each in system settings. */
  static readonly channels: Channel[] = [
    { id: 'collabs', name: 'Collabs', description: 'Invitations and requests to join projects', importance: 4 },
    { id: 'messages', name: 'Messages', description: 'Unread messages in your conversations', importance: 4 },
    { id: 'sales', name: 'Sales and tips', description: 'Releases and stems sold, tips received', importance: 3 },
    { id: 'payouts', name: 'Payouts', description: 'Updates on money you withdraw', importance: 3 },
  ]

  available (push: NotificationSettings['push']): boolean {
    return push.nativeEnabled
  }

  async permission (): Promise<PushPermission> {
    const { receive } = await PushNotifications.checkPermissions()

    if (receive === 'granted' || receive === 'denied') {
      return receive
    }

    return 'default'
  }

  async isOn (): Promise<boolean> {
    return !!NativePush.storedToken() && (await this.permission()) === 'granted'
  }

  async enable () {
    const { receive } = await PushNotifications.requestPermissions()

    if (receive !== 'granted') {
      throw new Error('Notifications are blocked for Toneflix Music. Allow them in your phone\'s settings to turn on push.')
    }

    const token = await NativePush.register()
    const response = await saveDeviceTokenRequest(token, Capacitor.getPlatform()).send()

    NativePush.store(token)
    NativePush.write(NativePush.offKey, null)

    return response
  }

  async disable () {
    NativePush.write(NativePush.offKey, '1')

    return NativePush.unregister()
  }

  /**
   * Listens for taps on notifications and keeps this device's token on the
   * signed-in account.
   */
  static async start (router: Router) {
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const path = (notification.data as { path?: string } | undefined)?.path

      if (path) {
        void router.push(path)
      }
    })

    if (Capacitor.getPlatform() === 'android') {
      await Promise.all(NativePush.channels.map((channel) => PushNotifications.createChannel(channel)))
    }

    let synced = false

    router.afterEach(() => {
      if (synced || !AuthSession.current().token) return

      synced = true
      void NativePush.sync()
    })
  }

  /**
   * Sends this device's current token to the API. People are asked for
   * permission the first time they are signed in.
   */
  static async sync () {
    try {
      if (NativePush.read(NativePush.offKey)) return

      const device = new NativePush()
      let permission = await device.permission()

      if (permission === 'default' && !NativePush.read(NativePush.askedKey)) {
        NativePush.write(NativePush.askedKey, '1')
        permission = (await PushNotifications.requestPermissions()).receive === 'granted' ? 'granted' : 'denied'
      }

      if (permission === 'granted') {
        await device.enable()
      }
    } catch {
      // Push stays off until it is turned on from the settings page.
    }
  }

  /**
   * Stops push to this device for the account that is signing out.
   */
  static async forget () {
    try {
      await NativePush.unregister()
    } catch {
      NativePush.store(null)
    }
  }

  /** Removes this device's token from the API and from Firebase. */
  static async unregister () {
    const token = NativePush.storedToken()

    if (!token) return null

    const response = await deleteDeviceTokenRequest(token).send()

    await PushNotifications.unregister()
    NativePush.store(null)

    return response
  }

  /** Registers with Firebase and resolves with this device's token. */
  static async register (ms = 20000): Promise<string> {
    let resolve: (token: string) => void = () => undefined
    let reject: (error: Error) => void = () => undefined

    const token = new Promise<string>((done, fail) => {
      resolve = done
      reject = fail
    })
    const timer = setTimeout(() => reject(new Error('Couldn\'t reach the notification service. Check your connection and try again.')), ms)
    const listeners = await Promise.all([
      PushNotifications.addListener('registration', ({ value }) => resolve(value)),
      PushNotifications.addListener('registrationError', ({ error }) => reject(new Error(error))),
    ])

    try {
      await PushNotifications.register()

      return await token
    } finally {
      clearTimeout(timer)
      await Promise.all(listeners.map((listener) => listener.remove()))
    }
  }

  static storedToken (): string | null {
    return NativePush.read(NativePush.tokenKey)
  }

  static store (token: string | null) {
    NativePush.write(NativePush.tokenKey, token)
  }

  static read (key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  static write (key: string, value: string | null) {
    try {
      if (value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, value)
      }
    } catch {
      // Storage can be unavailable; the token is sent again on the next launch.
    }
  }
}
