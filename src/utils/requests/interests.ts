import { alova } from 'src/boot/alova';
import type { AccountTypeValue, Interests, ResponseBody } from '../models';

export type InterestsFields = Partial<{
  account_type: AccountTypeValue;
  identities: string[];
  genres: number[];
}>;

/**
 * The signed-in user's account type, identities and interest genres.
 */
export const loadInterestsRequest = () =>
  alova.Get<ResponseBody<Interests>>('account/interests', { cacheFor: 0 });

/**
 * Save any of the account type, identities and interest genres.
 */
export const saveInterestsRequest = (fields: InterestsFields) =>
  alova.Put<ResponseBody<Interests>>('account/interests', fields);
