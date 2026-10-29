import { alova } from 'src/boot/alova';
import { frontUrl } from 'src/utils/env';
import type { ReferralSummary, ReferredUser, Referrer, ResponseBody } from '../models';

/**
 * The signed-in user's invite code, the terms they earn on, and what invites earned.
 */
export const loadReferralsRequest = () =>
  alova.Get<ResponseBody<ReferralSummary>>('account/referrals', { cacheFor: 0 });

/**
 * Change the signed-in user's invite code.
 */
export const saveReferralCodeRequest = (code: string) =>
  alova.Put<ResponseBody<ReferralSummary>>('account/referrals', { code });

/**
 * The people the signed-in user invited, newest first. With a month (YYYY-MM),
 * also what each earned that month, biggest first.
 */
export const loadInvitesRequest = (params: { page?: number; limit?: number; month?: string } = {}) =>
  alova.Get<ResponseBody<ReferredUser[]>>('account/referrals/invites', { params, cacheFor: 0 });

/**
 * Who owns an invite code.
 */
export const loadReferrerRequest = (code: string) =>
  alova.Get<ResponseBody<Referrer>>(`referrals/${encodeURIComponent(code)}`);

/**
 * The link people sign up through.
 */
export const inviteLink = (code: string) => `${frontUrl}/join/${code}`;
