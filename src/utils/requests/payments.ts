import {
  Earnings,
  PaymentOptions,
  PaymentProvider,
  PaymentPurpose,
  PaymentRegion,
  PaymentSession,
  PremiumStatus,
  ResponseBody,
  Transaction,
} from '../models';

import { alova } from 'src/boot/alova';

export type PaymentBody = {
  purpose: PaymentPurpose;
  id?: string | number;
  plan?: string | number;
  /** How many plan periods to pay for at once */
  cycles?: number;
  amount?: number;
  message?: string;
  /** The size of the AI credit pack being bought */
  credits?: number;
};

/** How a payment starts: the provider, and whether it runs in the provider's popup. */
export type PaymentStart = {
  provider?: PaymentProvider;
  inline?: boolean;
  /** The app page to go back to once the payment is confirmed */
  return_path?: string;
};

/**
 * The currency the signed-in user pays in and the providers they can choose.
 */
export const loadPaymentOptionsRequest = () => {
  return alova.Get<ResponseBody<PaymentOptions>>('payments/options', {
    cacheFor: 60 * 1000,
  });
};

/**
 * Start a payment. The API creates a pending transaction and the provider's session.
 */
export const startPaymentRequest = (body: PaymentBody & PaymentStart) => {
  return alova.Post<ResponseBody<PaymentSession>>('payments', body);
};

/**
 * Ask the API to confirm a payment with its provider. A payment still in progress answers 202.
 */
export const verifyPaymentRequest = (reference: string) => {
  return alova.Post<ResponseBody<Transaction>>(
    `payments/${reference}/verify`,
    {},
    {
      name: 'verify-payment',
    },
  );
};

/**
 * The user's plan, what it includes, and when their paid time runs out.
 */
export const loadSubscriptionRequest = () => {
  return alova.Get('account/subscription', {
    transform: (e: ResponseBody<PremiumStatus>) => e.data,
    cacheFor: 0,
  });
};

/**
 * What the user has bought.
 */
export const loadPurchasesRequest = (
  params?: Record<string, string | number>,
) => {
  return alova.Get<ResponseBody<Transaction[]>>('account/purchases', {
    cacheFor: 0,
    params,
  });
};

/**
 * What the creator has earned from sales and tips.
 */
export const loadEarningsRequest = (
  params?: Record<string, string | number>,
) => {
  return alova.Get<ResponseBody<Transaction[]> & { summary: Earnings }>(
    'account/earnings',
    {
      cacheFor: 0,
      params,
    },
  );
};

/**
 * Download links for a track's stems (owner or buyer only).
 */
export const loadStemDownloadsRequest = (trackId: string | number) => {
  return alova.Get<
    ResponseBody<{ id: number; title: string; filename?: string; size?: number; url: string }[]>
  >(`tracks/${trackId}/stems`, { cacheFor: 0 });
};

/**
 * A download link for offline listening (Premium, or a bought release).
 */
export const loadTrackDownloadRequest = (trackId: string | number) => {
  return alova.Get<ResponseBody<{ url: string; filename: string }>>(
    `tracks/${trackId}/download`,
    { cacheFor: 0 },
  );
};

/** How paid streams are counted and weighted, from the admin settings. */
export type StreamRules = {
  poolShare: number;
  minSeconds: number;
  dailyCap: number;
  weights: { collaboration: number; recorded: number; agentic: number };
  checkPlays: number;
  checkShare: number;
};

/** One month of stream stats. */
export type StreamStatsMonth = {
  /** YYYY-MM */
  month: string;
  plays: number;
  paid: number;
  /** Paid streams held by a stream check */
  held: number;
  earned: number;
  /** False while the month is estimated at the last settled rate */
  settled: boolean;
};

export type StatsType = 'track' | 'album' | 'project';

/** Stream stats for one of the creator's tracks, albums or projects. */
export type StreamStatsReport = {
  item: {
    type: StatsType;
    id: number;
    slug: string;
    title: string;
    imageUrl?: string | null;
    artist?: string | null;
    origin?: string | null;
    releaseId?: number;
    projectId?: number;
  };
  totals: { plays: number; listeners: number; paid: number; held: number; earned: number };
  months: StreamStatsMonth[];
  rules: StreamRules;
};

/** A creator's track with its stream stats for a month. */
export type StreamTrack = {
  id: number;
  slug: string;
  title: string;
  imageUrl?: string | null;
  artist?: string | null;
  album?: string | null;
  origin?: 'collaboration' | 'recorded' | 'agentic' | null;
  plays: number;
  paid: number;
  held: number;
  earned: number;
};

export type StreamTrackMonth = {
  month: string;
  rate: number;
  settled: boolean;
};

/** The creator's paid streams this month and what streams earned so far. */
export type StreamSummary = {
  eligible: boolean;
  plays: number;
  /** Paid streams this month held by a stream check */
  held: number;
  weighted: number;
  /** This month's weighted streams at last month's rate */
  estimate: number;
  earned: number;
  lastRate: number;
  currency: string;
  rules: StreamRules;
  /** The last twelve months, oldest first */
  months: StreamStatsMonth[];
};

export const loadStreamSummaryRequest = () =>
  alova.Get<ResponseBody<StreamSummary>>('account/earnings/streams', { cacheFor: 0 });

/**
 * The creator's tracks with plays, paid streams and earnings for a month, best first.
 */
export const loadStreamTracksRequest = (
  params: { month?: string; release_id?: number; project_id?: number; page?: number; limit?: number } = {},
) =>
  alova.Get<ResponseBody<StreamTrack[]> & { month: StreamTrackMonth }>('account/earnings/streams/tracks', {
    params,
    cacheFor: 0,
  });

/**
 * Stream stats for one of the creator's tracks, albums or projects.
 */
export const loadStreamStatsRequest = (type: StatsType, id: number | string) =>
  alova.Get<ResponseBody<StreamStatsReport>>(`account/stats/${type}/${id}`, { cacheFor: 0 });

/**
 * Payment regions, for admins with manage-configuration.
 */
export const loadPaymentRegionsRequest = (params: { page?: number; limit?: number; search?: string } = {}) =>
  alova.Get<ResponseBody<PaymentRegion[]>>('admin/payments/regions', { params, cacheFor: 0 });

export type PaymentRegionBody = {
  name: string;
  countries: string[];
  providers: PaymentProvider[];
  currency: string;
  exchange_rate?: number | null;
  rate_markup?: number | null;
  active?: boolean;
};

export const savePaymentRegionRequest = (body: PaymentRegionBody, id?: number) =>
  id
    ? alova.Put<ResponseBody<PaymentRegion>>(`admin/payments/regions/${id}`, body)
    : alova.Post<ResponseBody<PaymentRegion>>('admin/payments/regions', body);

export const deletePaymentRegionRequest = (id: number) =>
  alova.Delete<ResponseBody<PaymentRegion>>(`admin/payments/regions/${id}`);
