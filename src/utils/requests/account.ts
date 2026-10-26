import { alova, axios } from 'src/boot/alova'
import type { ResponseBody, User } from '../models'

export type AccountFields = Partial<{
  firstname: string;
  lastname: string;
  username: string;
  about: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  password: string;
  new_password: string;
  new_password_confirmation: string;
}>

/**
 * Save some of the signed-in account's details. `section` names what changed,
 * for the confirmation message.
 */
export const updateAccountRequest = (section: string, fields: AccountFields) =>
  alova.Put<ResponseBody<User>>(`account/${section}`, fields)

/**
 * Replace the signed-in account's profile photo.
 */
export const updateAvatarRequest = (image: File) => {
  const data = new FormData()

  data.append('image', image)

  const request = axios.Post<ResponseBody<User>>('account/update/profile/picture', data)

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}
