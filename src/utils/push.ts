import type { ResponseBody } from 'src/utils/models'
import {
  deletePushSubscriptionRequest,
  savePushSubscriptionRequest,
  type NotificationSettings,
} from 'src/utils/requests/notifications'

export type PushPermission = NotificationPermission | 'unsupported'

type SettingsResponse = ResponseBody<NotificationSettings>

/**
 * Push on this device: a browser through its service worker, or the
 * installed app through Firebase Cloud Messaging.
 */
export interface PushDevice {
  /** Words for the settings page, like "this browser" */
  readonly name: string;
  available (push: NotificationSettings['push']): boolean;
  permission (): Promise<PushPermission>;
  isOn (): Promise<boolean>;
  enable (push: NotificationSettings['push']): Promise<SettingsResponse>;
  disable (): Promise<SettingsResponse | null>;
}

/**
 * The push for where the app runs. The installed app loads its own.
 */
export const devicePush = async (): Promise<PushDevice> => {
  if (import.meta.env.QUASAR_CAPACITOR_MODE) {
    const { NativePush } = await import('src/utils/native-push')

    return new NativePush()
  }

  return new BrowserPush()
}

const WORKER_URL = '/push-sw.js'

/**
 * Browser push: the service worker that shows notifications, and the
 * subscription the API sends them to.
 */
export class BrowserPush implements PushDevice {
  readonly name = 'this browser'

  supported (): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window
  }

  available (push: NotificationSettings['push']): boolean {
    return push.enabled && !!push.publicKey
  }

  async permission (): Promise<PushPermission> {
    return this.supported() ? Notification.permission : 'unsupported'
  }

  async registration (): Promise<ServiceWorkerRegistration> {
    return (await navigator.serviceWorker.getRegistration(WORKER_URL))
      ?? navigator.serviceWorker.register(WORKER_URL)
  }

  async current (): Promise<PushSubscription | null> {
    if (!this.supported()) return null
    const registration = await navigator.serviceWorker.getRegistration(WORKER_URL)
    return (await registration?.pushManager.getSubscription()) ?? null
  }

  async isOn (): Promise<boolean> {
    return !!(await this.current())
  }

  /**
   * Ask for permission, subscribe and register the browser with the API.
   */
  async enable (push: NotificationSettings['push']) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notifications are blocked for this site. Allow them in your browser settings to turn on push.')
    }

    const registration = await this.registration()
    await navigator.serviceWorker.ready

    const subscription = (await registration.pushManager.getSubscription())
      ?? await this.withTimeout(registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.decodeKey(push.publicKey ?? ''),
      }))

    const encoding = (PushManager as unknown as { supportedContentEncodings?: string[] })
      .supportedContentEncodings?.includes('aes128gcm') === false ? 'aesgcm' : 'aes128gcm'

    return savePushSubscriptionRequest(subscription.toJSON(), encoding).send()
  }

  async disable () {
    const subscription = await this.current()
    if (!subscription) return null

    const response = await deletePushSubscriptionRequest(subscription.endpoint).send()
    await subscription.unsubscribe()

    return response
  }

  /** The browser's push service can hang when it's unreachable. */
  withTimeout<T> (promise: Promise<T>, ms = 20000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(
        () => reject(new Error('Couldn\'t reach your browser\'s push service. Check your connection and try again.')),
        ms,
      )),
    ])
  }

  /** The VAPID key comes as URL-safe base64; the browser wants bytes. */
  decodeKey (key: string): Uint8Array<ArrayBuffer> {
    const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const bytes = new Uint8Array(new ArrayBuffer(raw.length))
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes
  }
}
