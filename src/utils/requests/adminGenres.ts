import { alova, axios } from 'src/boot/alova'
import type { Genre, ResponseBody } from '../models'

export type GenreForm = {
  title: string;
  slug?: string;
  description?: string | null;
  /** A new cover photo */
  image?: File | null;
  removeImage?: boolean;
}

export type GenreFilters = { search?: string; cover?: '' | 'with' | 'without'; sort?: 'title' | 'used'; page?: number }

export const loadAdminGenresRequest = (params: GenreFilters = {}) =>
  alova.Get<ResponseBody<Genre[]>>('admin/genres', {
    cacheFor: 0,
    params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')),
  })

/**
 * Add a genre, or save one when it has an id. The cover goes up with the rest.
 */
export const saveGenreRequest = (form: GenreForm, id?: Genre['id']) => {
  const data = new FormData()

  if (id) data.append('_method', 'PUT')
  data.append('title', form.title)
  if (form.slug) data.append('slug', form.slug)
  data.append('description', form.description || '')
  if (form.image) data.append('image', form.image)
  if (form.removeImage) data.append('remove_image', '1')

  const request = axios.Post<ResponseBody<Genre>>(id ? `admin/genres/${id}` : 'admin/genres', data, { name: 'create-genre' })
  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/** Remove a genre. One in use moves its music to `moveTo` first. */
export const deleteGenreRequest = (id: Genre['id'], moveTo?: Genre['id'] | null) =>
  alova.Delete<ResponseBody<{ deleted: boolean; movedTo?: number | null }>>(`admin/genres/${id}`, moveTo ? { move_to: moveTo } : {}, {
    name: 'create-genre',
  })
