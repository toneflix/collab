import type { QVueGlobals } from 'quasar'
import type { PaymentProvider } from 'src/utils/models'
import { loadPaymentOptionsRequest } from 'src/utils/requests/payments'

/**
 * Picks how the signed-in user pays: straight away when their region has one
 * provider, otherwise from a short dialog that shows what they will be charged.
 */
export class PaymentChoice {
  static readonly names: Record<PaymentProvider, string> = {
    paystack: 'Paystack',
    flutterwave: 'Flutterwave',
  }

  constructor (private readonly $q: QVueGlobals) {}

  /**
   * Resolves with the provider, or null when the payer cancels.
   *
   * @param amount The price in the app currency
   */
  async pick (amount?: number): Promise<PaymentProvider | null> {
    const { data } = await loadPaymentOptionsRequest().send()

    if (!data.providers.length) {
      throw new Error('Payments are not available right now.')
    }

    if (data.providers.length === 1) {
      return data.providers[0] ?? null
    }

    const charge = amount ? PaymentChoice.format(Math.ceil(amount * data.rate * 100) / 100, data.currency) : null

    return new Promise((resolve) => {
      this.$q
        .dialog({
          dark: true,
          title: charge ? `Pay ${charge}` : 'Pay',
          message: 'Choose how you want to pay.',
          options: {
            type: 'radio',
            model: data.providers[0],
            items: data.providers.map((provider) => ({ label: PaymentChoice.names[provider], value: provider })),
          },
          cancel: { flat: true, noCaps: true, label: 'Cancel' },
          ok: { unelevated: true, rounded: true, noCaps: true, color: 'toneflix', label: 'Continue' },
        })
        .onOk((provider: PaymentProvider) => resolve(provider))
        .onCancel(() => resolve(null))
    })
  }

  static format (amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toLocaleString()}`
    }
  }
}
