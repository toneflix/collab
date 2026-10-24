import {
  deletePushSubscriptionRequest,
  savePushSubscriptionRequest,
} from 'src/utils/requests/notifications'

const WORKER_URL = '/push-sw.js'

/**
 * Browser push for this device: the service worker that shows notifications,
 * and the subscription the API sends them to.
 */
export class DevicePush {
  static supported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window
  }

  static permission(): NotificationPermission | 'unsupported' {
    return this.supported() ? Notification.permission : 'unsupported'
  }

  static async registration(): Promise<ServiceWorkerRegistration> {
    return (await navigator.serviceWorker.getRegistration(WORKER_URL))
      ?? navigator.serviceWorker.register(WORKER_URL)
  }

  static async current(): Promise<PushSubscription | null> {
    if (!this.supported()) return null
    const registration = await navigator.serviceWorker.getRegistration(WORKER_URL)
    return (await registration?.pushManager.getSubscription()) ?? null
  }

  /**
   * Ask for permission, subscribe and register the device with the API.
   */
  static async enable(publicKey: string) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notifications are blocked for this site. Allow them in your browser settings to turn on push.')
    }

    const registration = await this.registration()
    await navigator.serviceWorker.ready

    const subscription = (await registration.pushManager.getSubscription())
      ?? await this.withTimeout(registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.decodeKey(publicKey),
      }))

    const encoding = (PushManager as unknown as { supportedContentEncodings?: string[] })
      .supportedContentEncodings?.includes('aes128gcm') === false ? 'aesgcm' : 'aes128gcm'

    return savePushSubscriptionRequest(subscription.toJSON(), encoding).send()
  }

  static async disable() {
    const subscription = await this.current()
    if (!subscription) return null

    const response = await deletePushSubscriptionRequest(subscription.endpoint).send()
    await subscription.unsubscribe()

    return response
  }

  /** The browser's push service can hang when it's unreachable. */
  static withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(
        () => reject(new Error('Couldn\'t reach your browser\'s push service. Check your connection and try again.')),
        ms,
      )),
    ])
  }

  /** The VAPID key comes as URL-safe base64; the browser wants bytes. */
  static decodeKey(key: string): Uint8Array<ArrayBuffer> {
    const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const bytes = new Uint8Array(new ArrayBuffer(raw.length))
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes
  }
}
