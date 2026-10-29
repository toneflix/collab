import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type RoyaltyInviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export type RoyaltyInvite = {
  id?: number;
  email: string;
  name: string;
  rate: number;
  months: number;
  code?: string | null;
  note?: string | null;
  status: RoyaltyInviteStatus;
  hasAccount: boolean;
  invitedBy?: { id: number; username: string; fullname: string };
  expiresAt: string;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
};

export type RoyaltyContract = {
  id: number;
  rate: number;
  months: number;
  note?: string | null;
  active: boolean;
  startsAt: string;
  endsAt?: string | null;
  invited?: number;
  earned?: number;
  user?: {
    id: number;
    username: string;
    fullname: string;
    email: string;
    code?: string | null;
    imageUrl?: string | null;
  };
};

export type RoyaltyTermsFields = {
  rate: number;
  months: number;
  code?: string | null;
  note?: string | null;
};

export type RoyaltyInviteFields = RoyaltyTermsFields & {
  email: string;
  name: string;
};

type ListParams = { status?: string; search?: string; page?: number; limit?: number };

/**
 * A page of royals' contracts or of royalty invites, for admins.
 */
export const loadRoyaltyListRequest = (view: 'contracts' | 'invites', params: ListParams = {}) =>
  alova.Get<ResponseBody<RoyaltyInvite[] | RoyaltyContract[]>>(`admin/royalties/${view}`, { params, cacheFor: 0 });

export const sendRoyaltyInviteRequest = (fields: RoyaltyInviteFields) =>
  alova.Post<ResponseBody<RoyaltyInvite>>('admin/royalties/invites', fields);

export const resendRoyaltyInviteRequest = (id: number) =>
  alova.Post<ResponseBody<RoyaltyInvite>>(`admin/royalties/invites/${id}/resend`, {});

export const cancelRoyaltyInviteRequest = (id: number) =>
  alova.Post<ResponseBody<RoyaltyInvite>>(`admin/royalties/invites/${id}/cancel`, {});

export const updateRoyaltyContractRequest = (id: number, fields: Partial<RoyaltyTermsFields>) =>
  alova.Put<ResponseBody<RoyaltyContract>>(`admin/royalties/contracts/${id}`, fields);

export const endRoyaltyContractRequest = (id: number, reason?: string) =>
  alova.Post<ResponseBody<RoyaltyContract>>(`admin/royalties/contracts/${id}/end`, { reason });

/**
 * An invite by its emailed token, for the person it was sent to.
 */
export const loadRoyaltyInviteRequest = (token: string) =>
  alova.Get<ResponseBody<RoyaltyInvite>>(`royalty-invites/${encodeURIComponent(token)}`, { cacheFor: 0 });

export const acceptRoyaltyInviteRequest = (token: string) =>
  alova.Post<ResponseBody<RoyaltyContract>>(`royalty-invites/${encodeURIComponent(token)}/accept`, {});

/**
 * "35% for 12 months" style summary of a royal's terms.
 */
export const termsLine = (terms: { rate: number; months: number }) =>
  `${Number(terms.rate)}%${terms.months ? ` for ${terms.months} months` : ''}`;
