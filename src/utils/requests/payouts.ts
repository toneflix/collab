import { alova } from 'src/boot/alova'
import type { EnvKey, ResponseBody, SettingField } from '../models'

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | 'cancelled'

export type Payout = {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  /** What the creator receives, set once it is sent */
  payoutAmount?: number | null;
  payoutCurrency?: string | null;
  exchangeRate?: number | null;
  provider?: PayoutProvider;
  status: PayoutStatus;
  /** Why it failed or was rejected */
  reason?: string | null;
  bank: {
    country?: string | null;
    method?: string | null;
    name?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
  };
  /** Admin listings only */
  user?: { id: number; username: string; fullname: string; imageUrl?: string | null };
  reviewer?: { id: number; fullname: string } | null;
  transferCode?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayoutProvider = 'paystack' | 'flutterwave' | 'stripe'

export type PayoutAccount = {
  provider: PayoutProvider;
  country: string;
  /** bank, mobile_money or hosted */
  method: string;
  /** A hosted account is pending until the creator finishes the provider's onboarding */
  status: 'active' | 'pending';
  bankCode?: string | null;
  bankName?: string | null;
  /** Masked, e.g. ******6789 */
  accountNumber?: string | null;
  accountName: string;
  currency: string;
  updatedAt?: string;
}

export type PayoutMethod = {
  key: string;
  label: string;
  /** resolve: the provider finds the name; validate: name and ID are checked; none: the creator types the name; hosted: set up with the provider */
  lookup: 'resolve' | 'validate' | 'none' | 'hosted';
  numberLabel: string;
  numberPattern: string;
  providerLabel: string;
}

export type PayoutCountry = {
  code: string;
  name: string;
  provider: PayoutProvider;
  currency: string;
  methods: PayoutMethod[];
}

export type AccountDetails = {
  country: string;
  method: string;
  bank_code: string;
  account_number: string;
  account_name?: string;
  account_type?: 'personal' | 'business';
  document_type?: 'identityNumber' | 'passportNumber' | 'businessRegistrationNumber';
  document_number?: string;
}

export const providerNames: Record<PayoutProvider, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
}

/**
 * Where an account's money goes, in one line.
 */
export const accountLine = (account: Pick<PayoutAccount, 'method' | 'bankName' | 'accountNumber' | 'provider'>) => {
  if (account.method === 'hosted') return `Bank account through ${providerNames[account.provider] || 'the provider'}`
  return [account.bankName, account.accountNumber].filter(Boolean).join(' · ')
}

export const methodIcon = (method?: string | null) =>
  method === 'mobile_money' ? 'fas fa-mobile-screen' : method === 'hosted' ? 'fas fa-globe' : 'fas fa-building-columns'

/**
 * An amount in a currency that may not be the app's.
 */
export const money = (amount?: number | null, currency?: string | null) => {
  if (amount == null || !currency) return ''
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
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

/**
 * Countries creators can be paid in, and the kinds of account each takes.
 */
export const loadPayoutCountriesRequest = () => {
  return alova.Get('account/payouts/countries', {
    cacheFor: 60 * 60 * 1000,
    transform: (e: ResponseBody<PayoutCountry[]>) => e.data,
  })
}

/**
 * Banks or mobile money networks for a way of getting paid in a country.
 */
export const loadBanksRequest = (country: string, method: string) => {
  return alova.Get('account/payouts/banks', {
    cacheFor: 60 * 60 * 1000,
    params: { country, method },
    transform: (e: ResponseBody<Bank[]>) => e.data,
  })
}

/**
 * The name on an account, to confirm before saving it.
 */
export const resolveAccountRequest = (body: AccountDetails) => {
  return alova.Post<ResponseBody<ResolvedAccount>>('account/payouts/account/resolve', body)
}

export const savePayoutAccountRequest = (body: AccountDetails) => {
  return alova.Put<ResponseBody<PayoutAccount>>('account/payouts/account', body)
}

/**
 * Start or continue the provider's own onboarding; returns the link to send the creator to.
 */
export const connectPayoutAccountRequest = (country: string, returnUrl: string) => {
  return alova.Post<ResponseBody<{ url: string }>>('account/payouts/account/connect', { country, return_url: returnUrl })
}

export const loadPayoutAccountRequest = () => {
  return alova.Get<ResponseBody<PayoutAccount | null>>('account/payouts/account', { cacheFor: 0 })
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

export type PayoutSettings = {
  fields: Record<string, SettingField>;
  keys: Record<PayoutProvider, EnvKey[]>;
  currency: string;
  webhooks: Record<PayoutProvider, string>;
  countries: Omit<PayoutCountry, 'methods'>[];
}

/**
 * Which providers pay creators, and whether their .env keys are set. Needs manage-configuration.
 */
export const loadPayoutSettingsRequest = () => {
  return alova.Get<ResponseBody<PayoutSettings>>('admin/payouts/settings', { cacheFor: 0 })
}

export const savePayoutSettingsRequest = (body: Record<string, string | boolean | null>) => {
  return alova.Put<ResponseBody<PayoutSettings>>('admin/payouts/settings', body)
}
