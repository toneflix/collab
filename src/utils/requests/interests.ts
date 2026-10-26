import { alova } from 'src/boot/alova';
import type { AccountTypeValue, Interests, ResponseBody, Topic } from '../models';

export type InterestsFields = Partial<{
  account_type: AccountTypeValue;
  identities: string[];
  genres: number[];
  topics: number[];
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

/**
 * Music topics, most picked first.
 */
export const loadTopicsRequest = (params: { page?: number; limit?: number; search?: string } = {}) =>
  alova.Get<ResponseBody<Topic[]>>('topics', { params, cacheFor: 0 });

/**
 * Add a topic for everyone, or get the one with the same name.
 */
export const addTopicRequest = (title: string) =>
  alova.Post<ResponseBody<Topic>>('topics', { title });
