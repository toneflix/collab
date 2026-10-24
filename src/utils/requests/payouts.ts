import { alova } from 'src/boot/alova'
import type { ResponseBody } from '../models'

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | 'cancelled'

export type Payout = {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  /** Why it failed or was rejected */
  reason?: string | null;
  bank: { name?: string | null; accountNumber?: string | null; accountName?: string | null };
  /** Admin listings only */
  user?: { id: number; username: string; fullname: string; imageUrl?: string | null };
  reviewer?: { id: number; fullname: string } | null;
  transferCode?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayoutAccount = {
  bankCode: string;
  bankName: string;
  /** Masked, e.g. ******6789 */
  accountNumber: string;
  accountName: string;
  currency: string;
  updatedAt?: string;
}

export type PayoutSummary = {
  earned: number;
  /** Earnings still inside the clearing period */
  clearing: number;
  withdrawn: number;
  /** Requested or on the way to the bank */
  inFlight: number;
  available: number;
  minimum: number;
  holdDays: number;
  currency: string;
}

export type Bank = { name: string; code: string }

export type ResolvedAccount = {
  account_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

export type PayoutsResponse = ResponseBody<Payout[]> & {
  summary: PayoutSummary;
  account: PayoutAccount | null;
}

export type AdminPayoutsResponse = ResponseBody<Payout[]> & {
  summary: { pendingCount: number; pendingAmount: number };
}

/**
 * The first validation error or message in a failed response.
 */
export const payoutError = (e: unknown, fallback: string) => {
  const err = e as ResponseBody
  const first = err?.errors ? Object.values(err.errors)[0] : undefined
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback
}

/**
 * The creator's withdrawals, balance and bank account.
 */
export const loadPayoutsRequest = (params?: Record<string, string | number>) => {
  return alova.Get<PayoutsResponse>('account/payouts', { cacheFor: 0, params })
}

export const requestPayoutRequest = (amount: number) => {
  return alova.Post<ResponseBody<Payout> & { summary: PayoutSummary }>('account/payouts', { amount })
}

export const cancelPayoutRequest = (id: number) => {
  return alova.Delete<ResponseBody<Payout> & { summary: PayoutSummary }>(`account/payouts/${id}`)
}

export const loadBanksRequest = () => {
  return alova.Get('account/payouts/banks', {
    cacheFor: 60 * 60 * 1000,
    transform: (e: ResponseBody<Bank[]>) => e.data,
  })
}

/**
 * The name on an account, to confirm before saving it.
 */
export const resolveAccountRequest = (body: { bank_code: string; account_number: string }) => {
  return alova.Post<ResponseBody<ResolvedAccount>>('account/payouts/account/resolve', body)
}

export const savePayoutAccountRequest = (body: { bank_code: string; account_number: string }) => {
  return alova.Put<ResponseBody<PayoutAccount>>('account/payouts/account', body)
}

export const removePayoutAccountRequest = () => {
  return alova.Delete<ResponseBody<null>>('account/payouts/account')
}

/**
 * Every creator's withdrawals, for admins with manage-payouts.
 */
export const loadAdminPayoutsRequest = (params?: Record<string, string | number>) => {
  return alova.Get<AdminPayoutsResponse>('admin/payouts', { cacheFor: 0, params })
}

export const approvePayoutRequest = (id: number) => {
  return alova.Post<ResponseBody<Payout>>(`admin/payouts/${id}/approve`, {})
}

export const rejectPayoutRequest = (id: number, reason?: string) => {
  return alova.Post<ResponseBody<Payout>>(`admin/payouts/${id}/reject`, { reason })
}

export const syncPayoutRequest = (id: number) => {
  return alova.Post<ResponseBody<Payout>>(`admin/payouts/${id}/sync`, {})
}
