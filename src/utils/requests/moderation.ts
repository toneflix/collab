import { alova } from 'src/boot/alova'
import type { Release, ResponseBody } from '../models'

export type ReportableType = 'release' | 'track' | 'sound' | 'song' | 'project' | 'artist' | 'comment' | 'user'

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
  /** Accounts can't be deleted from moderation */
  canDelete?: boolean;
  /** What the moderator types to confirm a delete */
  deleteName?: string | null;
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

export type AiReview = {
  id: number;
  /** "manual" when an admin sent it, "auto" when automatic review sent it */
  mode: 'manual' | 'auto';
  /** "flagged" means the moderator wasn't confident and a person should decide */
  status: 'queued' | 'decided' | 'flagged' | 'failed' | 'skipped';
  decision?: 'approve' | 'reject' | 'unsure' | null;
  confidence?: number | null;
  summary?: string | null;
  note?: string | null;
  error?: string | null;
  model?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

/** Counts shown on the moderation tabs, sent with every moderation list */
export type ModerationStats = {
  pending: number;
  appeals: number;
  /** Releases waiting for approval */
  releases?: number;
  /** Artist claims waiting for review */
  claims?: number;
  /** Whether the AI moderator can be used */
  aiModerator?: boolean;
}

export type ReleaseReview = Release & {
  owner: { id: number; name: string; username?: string } | null;
  /** Title of the project this release is a version of */
  versionOf?: string | null;
  submittedAt: string;
  aiReview?: AiReview | null;
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

export type ModerationList<X> = ResponseBody<X[]> & { stats: ModerationStats }

export const loadModerationQueueRequest = (params: QueueParams = {}) =>
  alova.Get<ModerationList<QueueItem>>('admin/moderation/queue', { params: clean(params), cacheFor: 0 })

export const loadAdminTakedownsRequest = (params: { status?: string; search?: string; page?: number } = {}) =>
  alova.Get<ModerationList<Takedown>>('admin/moderation/takedowns', { params: clean(params), cacheFor: 0 })

export const takeDownRequest = (type: ReportableType, id: number, form: { reason: string; note?: string }) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/items/${type}/${id}/takedown`, form)

export type DeleteContentForm = { reason: string; note?: string; confirm_name: string; code: string }

/**
 * Delete content for good. Needs its name typed out and a two-factor code.
 */
export const deleteContentRequest = (type: ReportableType, id: number, form: DeleteContentForm) =>
  alova.Delete<ResponseBody<{ deleted: boolean }>>(`admin/moderation/items/${type}/${id}`, form)

export const dismissReportsRequest = (type: ReportableType, id: number) =>
  alova.Post<ResponseBody<{ closed: number }>>(`admin/moderation/items/${type}/${id}/dismiss`)

export const resolveReportsRequest = (type: ReportableType, id: number) =>
  alova.Post<ResponseBody<{ closed: number }>>(`admin/moderation/items/${type}/${id}/resolve`)

export const restoreTakedownRequest = (id: number, resolution?: string) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/takedowns/${id}/restore`, { resolution })

export const upholdTakedownRequest = (id: number, resolution?: string) =>
  alova.Post<ResponseBody<Takedown>>(`admin/moderation/takedowns/${id}/uphold`, { resolution })

export const loadReleaseReviewsRequest = (params: { search?: string; page?: number } = {}) =>
  alova.Get<ModerationList<ReleaseReview>>('admin/moderation/releases', {
    params: clean({ ...params, with: 'artist' }),
    cacheFor: 0,
  })

export const approveReleaseRequest = (id: number | string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/releases/${id}/approve`)

export const rejectReleaseRequest = (id: number | string, note: string) =>
  alova.Post<ResponseBody<{ id: number }>>(`admin/moderation/releases/${id}/reject`, { note })

export const sendReleaseToAiRequest = (id: number | string) =>
  alova.Post<ResponseBody<AiReview>>(`admin/moderation/releases/${id}/ai-review`)

export const loadMyTakedownsRequest = (page = 1) =>
  alova.Get<ResponseBody<Takedown[]>>('account/takedowns', { params: { page }, cacheFor: 0 })

export const appealTakedownRequest = (id: number, message: string) =>
  alova.Post<ResponseBody<Takedown>>(`account/takedowns/${id}/appeal`, { message })

function clean<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))
}
