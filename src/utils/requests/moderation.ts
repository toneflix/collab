import { alova } from 'src/boot/alova'
import type { Release, ResponseBody } from '../models'

export type ReportableType = 'release' | 'track' | 'sound' | 'comment' | 'user'

export type ReportReason =
  | 'copyright' | 'dmca' | 'spam' | 'abuse' | 'violent' | 'self-harm'
  | 'child-safety' | 'privacy' | 'sensitive' | 'hate'

export const reportReasons: { value: ReportReason; label: string; hint?: string }[] = [
  { value: 'copyright', label: 'Copyright infringement', hint: 'It uses music or sounds someone else owns.' },
  { value: 'dmca', label: 'DMCA notice', hint: 'A formal takedown notice from the rights owner.' },
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Abuse or harassment' },
  { value: 'hate', label: 'Hate' },
  { value: 'violent', label: 'Violent speech' },
  { value: 'self-harm', label: 'Suicide or self-harm' },
  { value: 'child-safety', label: 'Child safety' },
  { value: 'privacy', label: 'Privacy concern' },
  { value: 'sensitive', label: 'Sensitive or disturbing media' },
]

export const isCopyrightReason = (reason?: string | null) => reason === 'copyright' || reason === 'dmca'

export const reasonLabel = (reason: string) => reportReasons.find((r) => r.value === reason)?.label ?? reason

export type ModeratedItem = {
  type: ReportableType;
  id: number;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  link?: string | null;
  canTakeDown: boolean;
  takenDown: boolean;
  owner?: { id: number; name: string; username?: string } | null;
}

export type Report = {
  id: number;
  /** "report" from a person, "match" from the audio check, "lyrics" from the lyrics check */
  type: 'report' | 'match' | 'lyrics';
  reason: ReportReason;
  details?: string | null;
  claim?: {
    original_url?: string;
    claimant?: string;
    email?: string;
    match_id?: number;
    match_title?: string;
    match_artist?: string;
    match_link?: string;
    score?: number;
    kind?: 'exact' | 'acoustic';
    /** Words the lyrics check found */
    words?: string[];
  } | null;
  status: 'pending' | 'dismissed' | 'actioned';
  user?: { id: number; name: string; username?: string } | null;
  createdAt: string;
}

export type Takedown = {
  id: number;
  item: ModeratedItem | null;
  reason: ReportReason;
  note?: string | null;
  status: 'active' | 'appealed' | 'restored';
  appeal?: string | null;
  appealedAt?: string | null;
  canAppeal: boolean;
  resolution?: string | null;
  resolvedAt?: string | null;
  moderator?: { id: number; name: string } | null;
  createdAt: string;
}

export type QueueItem = {
  key: string;
  item: ModeratedItem | null;
  reportsCount: number;
  matchesCount: number;
  lastReportedAt: string;
  reasons: Partial<Record<ReportReason, number>>;
  reports: Report[];
  takedown: Takedown | null;
}

export type ModerationMeta = {
  total: number;
  page: number;
  lastPage: number;
  pending: number;
  appeals: number;
  /** Releases waiting for approval */
  releases?: number;
}

export type ReleaseReview = Release & {
  owner: { id: number; name: string; username?: string } | null;
  /** Title of the project this release is a version of */
  versionOf?: string | null;
  submittedAt: string;
}

export type ReportForm = {
  type: ReportableType;
  id: number | string;
  reason: ReportReason;
  details?: string;
  claim?: { original_url?: string; claimant?: string; email?: string; statement?: boolean };
}

type QueueParams = { type?: string; reason?: string; source?: string; search?: string; page?: number; limit?: number }

export const reportContentRequest = (form: ReportForm) =>
  alova.Post<ResponseBody<Report>>('safety/reports', form)

export const loadModerationQueueRequest = (params: QueueParams = {}) =>
  alova.Get<{ data: QueueItem[]; meta: ModerationMeta }>('admin/moderation/queue', { params: clean(params), cacheFor: 0 })

export const loadAdminTakedownsRequest = (params: { status?: string; search?: string; page?: number } = {}) =>
  alova.Get<{ data: Takedown[]; meta: ModerationMeta }>('admin/moderation/takedowns', { params: clean(params), cacheFor: 0 })

export const takeDownRequest = (type: ReportableType, id: number, form: { reason: string; note?: string }) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/items/${type}/${id}/takedown`, form)

export const dismissReportsRequest = (type: ReportableType, id: number) =>
  alova.Post<ResponseBody<{ closed: number }>>(`admin/moderation/items/${type}/${id}/dismiss`)

export const resolveReportsRequest = (type: ReportableType, id: number) =>
  alova.Post<ResponseBody<{ closed: number }>>(`admin/moderation/items/${type}/${id}/resolve`)

export const restoreTakedownRequest = (id: number, resolution?: string) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/takedowns/${id}/restore`, { resolution })

export const upholdTakedownRequest = (id: number, resolution?: string) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/takedowns/${id}/uphold`, { resolution })

export const loadReleaseReviewsRequest = (params: { search?: string; page?: number } = {}) =>
  alova.Get<{ data: ReleaseReview[]; meta: ModerationMeta }>('admin/moderation/releases', {
    params: clean({ ...params, with: 'artist' }),
    cacheFor: 0,
  })

export const approveReleaseRequest = (id: number | string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/releases/${id}/approve`)

export const rejectReleaseRequest = (id: number | string, note: string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/releases/${id}/reject`, { note })

export const loadMyTakedownsRequest = (page = 1) =>
  alova.Get<{ data: Takedown[]; meta: { total: number; page: number; lastPage: number } }>('account/takedowns', { params: { page }, cacheFor: 0 })

export const appealTakedownRequest = (id: number, message: string) =>
  alova.Post<ResponseBody<Takedown>>(`account/takedowns/${id}/appeal`, { message })

function clean<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))
}
