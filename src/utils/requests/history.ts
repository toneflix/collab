import { alova } from 'src/boot/alova'
import type { ResponseBody } from '../models'

export type VersionAction = 'original' | 'saved' | 'added' | 'edited' | 'removed' | 'restored'

export type VersionChange =
  | { type: 'tempo' | 'meter' | 'title'; from: string | number | null; to: string | number | null }
  | { type: 'added' | 'removed'; stem_id: number; title: string }
  | { type: 'renamed'; stem_id: number; title: string; from: string }
  | { type: 'edited'; stem_id: number; title: string; what: string[] }

/** A saved state of a project track: who changed it and what changed. */
export type TrackVersion = {
  id: number;
  action: VersionAction;
  /** What changed, without a subject: "moved Bass and added Drums" */
  summary: string | null;
  changes: VersionChange[];
  user: { id: number; name: string; username?: string; imageUrl?: string | null } | null;
  /** How many stems the track had */
  stems: number;
  bpm: number | null;
  timeSignature: string | null;
  restoredFrom: { id: number; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type VersionList = {
  data: TrackVersion[];
  currentId: number | null;
  meta: { current_page: number; last_page: number; total: number };
}

export type RestoreResult = ResponseBody<TrackVersion> & {
  /** Stems the version had that are gone for good */
  missing: string[];
  /** Stems whose audio was replaced since, so they keep the new audio */
  keptAudio: string[];
}

const base = (projectId: string | number, trackId: string | number) => `creator/projects/${projectId}/tracks/${trackId}/versions`

export const loadTrackVersionsRequest = (projectId: string | number, trackId: string | number, page = 1) =>
  alova.Get<VersionList>(base(projectId, trackId), { params: { page, limit: 20 }, cacheFor: 0 })

export const restoreTrackVersionRequest = (projectId: string | number, trackId: string | number, versionId: number) =>
  alova.Post<RestoreResult>(`${base(projectId, trackId)}/${versionId}/restore`)
