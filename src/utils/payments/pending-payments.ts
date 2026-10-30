import type { PaymentProvider } from 'src/utils/models'
import { verifyPaymentRequest } from 'src/utils/requests/payments'

export type PendingPayment = {
  reference: string
  provider: PaymentProvider
  /** The app page the payment started on */
  returnPath: string
  startedAt: number
}

/**
 * Payments that left for a provider's page or app. They are kept on the device
 * so a payment is still confirmed when the app was closed while the payer was away.
 */
export class PendingPayments {
  static readonly key = 'payments.pending'

  /** Older payments are dropped; the API's webhooks settle them anyway. */
  static readonly maxAge = 24 * 60 * 60 * 1000

  static all (): PendingPayment[] {
    try {
      const list = JSON.parse(localStorage.getItem(PendingPayments.key) || '[]') as PendingPayment[]

      return list.filter((p) => Date.now() - p.startedAt < PendingPayments.maxAge)
    } catch {
      return []
    }
  }

  static add (payment: Omit<PendingPayment, 'startedAt'>) {
    PendingPayments.save([
      ...PendingPayments.all().filter((p) => p.reference !== payment.reference),
      { ...payment, startedAt: Date.now() },
    ])
  }

  static remove (reference: string) {
    PendingPayments.save(PendingPayments.all().filter((p) => p.reference !== reference))
  }

  static find (reference: string): PendingPayment | undefined {
    return PendingPayments.all().find((p) => p.reference === reference)
  }

  /**
   * Asks the API about each pending payment and forgets the ones that are settled.
   * Resolves with the payments that went through.
   */
  static async resume (): Promise<PendingPayment[]> {
    const paid: PendingPayment[] = []

    for (const payment of PendingPayments.all()) {
      try {
        const { data } = await verifyPaymentRequest(payment.reference).send()

        if (data.status === 'pending') continue

        PendingPayments.remove(payment.reference)

        if (data.status === 'complete') paid.push(payment)
      } catch {
        // Rejected payments are dropped; network errors are tried again later.
        if (navigator.onLine) PendingPayments.remove(payment.reference)
      }
    }

    return paid
  }

  private static save (list: PendingPayment[]) {
    try {
      localStorage.setItem(PendingPayments.key, JSON.stringify(list))
    } catch {
      // Storage is full or blocked; the return page still confirms the payment.
    }
  }
}
