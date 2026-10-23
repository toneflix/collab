import {
  Earnings,
  PaymentPurpose,
  PaymentSession,
  PremiumStatus,
  ResponseBody,
  Transaction,
} from '../models'

import { alova } from 'src/boot/alova'

export type PaymentBody = {
  purpose: PaymentPurpose;
  id?: string | number;
  plan?: 'monthly' | 'yearly';
  amount?: number;
  message?: string;
}

/**
 * Start a payment. The API creates a pending transaction and a Paystack session.
 */
export const startPaymentRequest = (body: PaymentBody) => {
  return alova.Post<ResponseBody<PaymentSession>>('payments', body)
}

/**
 * Ask the API to confirm a payment with Paystack.
 */
export const verifyPaymentRequest = (reference: string) => {
  return alova.Post<ResponseBody<Transaction>>(`payments/${reference}/verify`, {}, {
    name: 'verify-payment',
  })
}

/**
 * The user's Premium status, the plans on offer and the account limits.
 */
export const loadSubscriptionRequest = () => {
  return alova.Get('account/subscription', {
    transform: (e: ResponseBody<PremiumStatus>) => e.data,
    cacheFor: 0,
  })
}

/**
 * What the user has bought.
 */
export const loadPurchasesRequest = (params?: Record<string, string | number>) => {
  return alova.Get<ResponseBody<Transaction[]>>('account/purchases', {
    cacheFor: 0,
    params,
  })
}

/**
 * What the creator has earned from sales and tips.
 */
export const loadEarningsRequest = (params?: Record<string, string | number>) => {
  return alova.Get<ResponseBody<Transaction[]> & { summary: Earnings }>('account/earnings', {
    cacheFor: 0,
    params,
  })
}

/**
 * Download links for a track's stems (owner or buyer only).
 */
export const loadStemDownloadsRequest = (trackId: string | number) => {
  return alova.Get<ResponseBody<{ id: number, title: string, size?: number, url: string }[]>>(
    `tracks/${trackId}/stems`,
    { cacheFor: 0 }
  )
}

/**
 * A download link for offline listening (Premium, or a bought release).
 */
export const loadTrackDownloadRequest = (trackId: string | number) => {
  return alova.Get<ResponseBody<{ url: string, filename: string }>>(
    `tracks/${trackId}/download`,
    { cacheFor: 0 }
  )
}
