import { axios } from 'src/boot/alova'
import type { Artist, ResponseBody } from '../models'

export type ArtistProfileForm = {
  name: string;
  about?: string | null;
  image?: File | null;
  cover?: File | null;
  verified?: boolean;
}

/**
 * Save an artist's details, and new photos when picked.
 */
export const updateArtistProfileRequest = (id: string | number, form: ArtistProfileForm) => {
  const data = new FormData()

  data.append('_method', 'PUT')
  data.append('name', form.name)
  data.append('about', form.about || '')

  if (form.image) data.append('image', form.image)
  if (form.cover) data.append('cover', form.cover)
  if (form.verified !== undefined) data.append('verified', form.verified ? '1' : '0')

  return multipart(axios.Post<ResponseBody<Artist>>(`creator/artists/${id}`, data))
}

function multipart<T extends { config: { headers: Record<string, unknown> } }>(request: T) {
  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}
