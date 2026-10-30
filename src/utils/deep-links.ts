import type { Router } from 'vue-router'
import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { Notify } from 'quasar'
import { AuthSession } from 'src/utils/auth-session'
import { frontUrl } from 'src/utils/env'
import { PendingPayments } from 'src/utils/payments/pending-payments'

/**
 * Opens website links in the installed app (Android App Links, iOS Universal
 * Links), such as a payment provider sending the payer back. Payments left
 * pending when the app was closed are confirmed on launch.
 */
export class DeepLinks {
  /** Hosts whose links the app opens, besides this build's own address. */
  static readonly hosts = ['music.toneflix.net']

  static async start (router: Router) {
    await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => DeepLinks.open(router, event.url))

    void DeepLinks.resumePayments(router)
  }

  /**
   * The in-app path for a website link, or null for links to other sites.
   */
  static path (url: string): string | null {
    try {
      const link = new URL(url)
      const hosts = [...DeepLinks.hosts, frontUrl ? new URL(frontUrl).host : ''].filter(Boolean)

      if (!hosts.includes(link.host)) return null

      return `${link.pathname}${link.search}${link.hash}` || '/'
    } catch {
      return null
    }
  }

  static open (router: Router, url: string) {
    const path = DeepLinks.path(url)

    if (path && path !== router.currentRoute.value.fullPath) {
      void router.push(path)
    }
  }

  /**
   * Confirms payments that were still going when the app last closed, unless a
   * link is already taking the payer to the payment return page.
   */
  static async resumePayments (router: Router) {
    if (!AuthSession.current().token || !PendingPayments.all().length) return

    await router.isReady()

    if (router.currentRoute.value.name === 'payments.return') return

    const paid = await PendingPayments.resume()
    const last = paid[paid.length - 1]

    if (!last) return

    Notify.create({
      type: 'positive',
      message: paid.length > 1 ? 'Your payments went through.' : 'Your payment went through.',
      actions: [{ label: 'View', color: 'white', noCaps: true, handler: () => void router.push(last.returnPath) }],
    })
  }
}
