import type { PaymentSession } from 'src/utils/models'

type FlutterwaveCheckoutOptions = {
  public_key: string
  tx_ref: string
  amount: number
  currency: string
  redirect_url?: string
  customer: { email: string; name?: string }
  customizations?: { title?: string; logo?: string }
  callback: (response: { status?: string; tx_ref?: string; transaction_id?: number }) => void
  onclose: (incomplete?: boolean) => void
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: FlutterwaveCheckoutOptions) => { close: () => void }
  }
}

export type InlineResult = 'finished' | 'closed'

/**
 * Flutterwave's Inline popup, used in the installed app. It also gets the
 * return URL, so a payment finished outside the app comes back through the app link.
 */
export class FlutterwaveInline {
  static readonly script = 'https://checkout.flutterwave.com/v3.js'

  private static loading?: Promise<void>

  static load (): Promise<void> {
    if (window.FlutterwaveCheckout) return Promise.resolve()

    FlutterwaveInline.loading ??= new Promise<void>((resolve, reject) => {
      const tag = document.createElement('script')

      tag.src = FlutterwaveInline.script
      tag.async = true
      tag.onload = () => resolve()
      tag.onerror = () => {
        FlutterwaveInline.loading = undefined
        tag.remove()
        reject(new Error('Flutterwave could not be loaded. Check your connection and try again.'))
      }
      document.head.appendChild(tag)
    })

    return FlutterwaveInline.loading
  }

  /**
   * Opens the popup and resolves when the payer finishes or closes it.
   */
  static async pay (
    session: PaymentSession,
    publicKey: string,
    customer: { email: string; name?: string },
    title?: string,
  ): Promise<InlineResult> {
    await FlutterwaveInline.load()

    return new Promise<InlineResult>((resolve) => {
      let settled = false
      const done = (result: InlineResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }

      const modal = window.FlutterwaveCheckout?.({
        public_key: publicKey,
        tx_ref: session.reference,
        amount: session.chargeAmount,
        currency: session.currency,
        redirect_url: session.returnUrl,
        customer,
        customizations: { title },
        callback: () => {
          done('finished')
          modal?.close()
        },
        onclose: () => done('closed'),
      })

      if (!modal) done('closed')
    })
  }
}
