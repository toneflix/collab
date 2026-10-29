import { alova, axios } from 'src/boot/alova'
import type { ResponseBody } from '../models'
import type { ModeratedItem } from './moderation'

export type ContentKind = 'track' | 'release' | 'song' | 'project' | 'artist'

/** Content as the admin content pages list and edit it. */
export type AdminContent = ModeratedItem & {
  type: ContentKind;
  /** The values the edit form starts from */
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ContentOwner = { id: number; name: string; username: string; imageUrl?: string | null }

export type ContentFilters = { search?: string; status?: string; sort?: string; user_id?: number | null; page?: number; limit?: number }

/** Form values; files go up as uploads and booleans as 1 or 0. */
export type ContentForm = Record<string, string | number | boolean | File | null | undefined>

const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Record<string, string | number>

export const loadAdminContentRequest = (type: ContentKind, params: ContentFilters = {}) =>
  alova.Get<ResponseBody<AdminContent[]>>(`admin/content/${type}`, { params: clean(params), cacheFor: 0 })

export const loadAdminContentItemRequest = (type: ContentKind, id: number) =>
  alova.Get<ResponseBody<AdminContent>>(`admin/content/${type}/${id}`, { cacheFor: 0 })

export const loadContentOwnersRequest = (search = '') =>
  alova.Get<ResponseBody<ContentOwner[]>>('admin/content/owners', { params: clean({ search }), cacheFor: 0 })

/**
 * Add content, or save it when there is an id.
 */
export const saveAdminContentRequest = (type: ContentKind, form: ContentForm, id?: number) => {
  const data = new FormData()

  if (id) data.append('_method', 'PUT')

  Object.entries(form).forEach(([key, value]) => {
    if (value === undefined) return
    if (value instanceof File) data.append(key, value)
    else if (typeof value === 'boolean') data.append(key, value ? '1' : '0')
    else data.append(key, value === null ? '' : String(value))
  })

  const request = axios.Post<ResponseBody<AdminContent>>(id ? `admin/content/${type}/${id}` : `admin/content/${type}`, data)
  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}
