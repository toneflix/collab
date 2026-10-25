import { alova, axios } from 'src/boot/alova'
import type { Artist, ResponseBody } from '../models'
import type { AiReview, ModerationList } from './moderation'

export type ArtistClaimRole = 'artist' | 'manager' | 'label' | 'other'

export const claimRoles: { value: ArtistClaimRole; label: string; hint: string }[] = [
  { value: 'artist', label: 'I am the artist', hint: 'You perform or release music as this artist.' },
  { value: 'manager', label: 'I manage the artist', hint: 'You manage their career or day-to-day business.' },
  { value: 'label', label: 'Label or distributor', hint: 'You release or distribute their music.' },
  { value: 'other', label: 'Something else', hint: 'Tell us how you are connected in your note.' },
]

export const claimRoleLabel = (role: string) => claimRoles.find((r) => r.value === role)?.label ?? role

export type ArtistClaim = {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  role: ArtistClaimRole;
  name: string;
  email: string;
  links: string[];
  message: string;
  hasDocument: boolean;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  artist?: {
    id: number;
    name: string;
    username: string;
    imageUrl: string;
    claimable: boolean;
    /** Releases no account owns, which move to the claimant on approval */
    unownedReleases?: number | null;
  };
  user?: { id: number; name: string; username: string; email: string; imageUrl: string } | null;
  reviewer?: string | null;
  aiReview?: AiReview | null;
}

export type ArtistProfileForm = {
  name: string;
  about?: string | null;
  image?: File | null;
  cover?: File | null;
  verified?: boolean;
}

export type ArtistClaimForm = {
  role: ArtistClaimRole;
  name: string;
  email: string;
  links: string[];
  message: string;
  document?: File | null;
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

export const claimArtistRequest = (artist: string | number, form: ArtistClaimForm) => {
  const data = new FormData()

  data.append('role', form.role)
  data.append('name', form.name)
  data.append('email', form.email)
  data.append('message', form.message)
  form.links.filter((link) => link.trim()).forEach((link) => data.append('links[]', link.trim()))

  if (form.document) data.append('document', form.document)

  return multipart(axios.Post<ResponseBody<ArtistClaim>>(`artists/${artist}/claims`, data))
}

export const loadArtistClaimsRequest = (params: { status?: string; search?: string; page?: number } = {}) =>
  alova.Get<ModerationList<ArtistClaim>>(
    'admin/moderation/claims',
    { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')), cacheFor: 0 },
  )

export const approveArtistClaimRequest = (id: number, note?: string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/claims/${id}/approve`, { note: note || undefined })

export const rejectArtistClaimRequest = (id: number, note: string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/claims/${id}/reject`, { note })

export const sendClaimToAiRequest = (id: number) =>
  alova.Post<ResponseBody<AiReview>>(`admin/moderation/claims/${id}/ai-review`)

export const downloadClaimDocumentRequest = (id: number) =>
  axios.Get<Blob>(`admin/moderation/claims/${id}/document`, { responseType: 'blob' })

function multipart<T extends { config: { headers: Record<string, unknown> } }>(request: T) {
  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}
