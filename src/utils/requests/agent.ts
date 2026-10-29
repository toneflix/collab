import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type AgentRunStatus = 'queued' | 'planning' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type AgentRunView = 'open' | 'succeeded' | 'failed';

export type AgentStepKind = 'artist' | 'project' | 'song' | 'track' | 'music' | 'mix' | 'lyrics' | 'artwork' | 'release';

export type AgentStepStatus = 'pending' | 'waiting' | 'done' | 'failed' | 'skipped';

export type AgentStep = {
  id: number;
  key: string;
  kind: AgentStepKind;
  status: AgentStepStatus;
  title: string | null;
  instrumental: boolean | null;
  dependsOn: string[];
  /** Ids of what the step made */
  made: {
    artistId?: number;
    projectId?: number;
    songId?: number;
    trackId?: number;
    aiJobId?: number;
    releaseId?: number;
  };
  published: boolean | null;
  /** Whether a lyrics step timed the sheet to the audio */
  synced: boolean | null;
  /** Why the step went on without its work, like artwork that couldn't be drawn */
  notice: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AgentPlanTrack = {
  key: string;
  title: string;
  style: string;
  theme: string;
  mood: string | null;
  instrumental: boolean;
  /** Keys of the plan's artists the track features */
  featuring?: string[];
};

export type AgentPlan = {
  artists: { key: string; name: string; about: string }[];
  albums: {
    key: string;
    title: string;
    artist: string;
    genre_id: number | string | null;
    description: string;
    /** False when the album stays a studio project */
    release?: boolean;
    tracks: AgentPlanTrack[];
  }[];
  /** Existing projects the run releases */
  releases?: {
    key: string;
    project_id: number;
    project: string;
    title: string;
    version: string | null;
    artist: string;
    retire: boolean;
    tracks: { id: number; title: string }[];
  }[];
  /** Existing projects, or albums without a project, the run touches up */
  updates?: {
    key: string;
    project_id: number | null;
    release_id: number | null;
    project: string;
    title: string;
    artist: string | null;
    artwork: boolean;
    lyrics: { id: number; title: string }[];
  }[];
  songs: { key: string; title: string; theme: string; style: string; mood: string | null }[];
};

export type AgentRun = {
  id: number;
  prompt: string;
  status: AgentRunStatus;
  options: { publish: boolean; artwork: boolean; maxTracks: number | null; seconds: number | null; label: string | null; projectPrivacy?: ProjectPrivacy };
  plan: AgentPlan | null;
  counts: { artists: number; albums: number; releases?: number; updates?: number; tracks: number; songs: number } | null;
  progress: { done: number; total: number } | null;
  credits: number;
  error: string | null;
  failure: string | null;
  owner?: { id: number; name: string; username: string };
  queuedBy?: { id: number; name: string };
  steps?: AgentStep[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AgentOwner = {
  id: number;
  name: string;
  username: string;
  imageUrl: string | null;
  contentAgent: boolean;
  aiTools: boolean;
  credits: number;
};

export type AgentSettings = {
  available: boolean;
  maxTracks: number;
  defaultSeconds: number;
  maxSeconds: number;
  vocals: boolean;
  instrumentals: boolean;
  artwork: boolean;
};

export type AgentRunsResponse = ResponseBody<AgentRun[]> & { agent: AgentSettings };

export type AgentRunForm = {
  prompt: string;
  owner_id: number | null;
  publish: boolean;
  artwork: boolean;
  max_tracks: number;
  seconds: number;
  label: string;
  project_privacy: ProjectPrivacy;
};

/** Who can see the projects a run makes */
export type ProjectPrivacy = 'private' | 'public' | 'public_preview';

/** Runs that are still waiting or being built */
export const isActiveRun = (run: AgentRun) => ['queued', 'planning', 'running'].includes(run.status);

export const runStatusLabels: Record<AgentRunStatus, { label: string; color: string }> = {
  queued: { label: 'Queued', color: 'grey-7' },
  planning: { label: 'Planning', color: 'blue-8' },
  running: { label: 'Building', color: 'blue-8' },
  succeeded: { label: 'Done', color: 'green-8' },
  failed: { label: 'Failed', color: 'red-8' },
  cancelled: { label: 'Stopped', color: 'grey-8' },
};

/** Admins reach every agent account's runs; users of an agent account reach their own */
export type AgentScope = 'admin' | 'creator';

/** What the API sends on `agent.run` when a run moves on. */
export type AgentRunEvent = { id: number; status: AgentRun['status'] };

/** The realtime channel that announces run changes: every run for admins, the account's own for creators. */
export const agentRunChannel = (scope: AgentScope, userId?: number | string | null) =>
  scope === 'admin' ? 'admin.content' : userId ? `user.${userId}` : null;

export const loadAgentRunsRequest = (scope: AgentScope, params: { status?: AgentRunView; page?: number }) =>
  alova.Get<AgentRunsResponse>(`${scope}/agent/runs`, { cacheFor: 0, params });

export const loadAgentRunRequest = (scope: AgentScope, id: number) =>
  alova.Get<ResponseBody<AgentRun>>(`${scope}/agent/runs/${id}`, { cacheFor: 0 });

export const queueAgentRunRequest = (scope: AgentScope, form: AgentRunForm) =>
  alova.Post<ResponseBody<AgentRun>>(`${scope}/agent/runs`, {
    ...form,
    owner_id: scope === 'admin' ? form.owner_id : undefined,
    label: form.label || null,
  });

export const cancelAgentRunRequest = (scope: AgentScope, id: number) =>
  alova.Post<ResponseBody<AgentRun>>(`${scope}/agent/runs/${id}/cancel`, {});

export const retryAgentRunRequest = (scope: AgentScope, id: number) =>
  alova.Post<ResponseBody<AgentRun>>(`${scope}/agent/runs/${id}/retry`, {});

/** Agent accounts, or with `all` every account, for admins */
export const loadAgentOwnersRequest = (params: { search?: string; all?: boolean; page?: number; limit?: number }) =>
  alova.Get<ResponseBody<AgentOwner[]>>('admin/agent/owners', {
    cacheFor: 0,
    params: { ...params, all: params.all ? 1 : undefined },
  });

export const setAgentAccountRequest = (userId: number, enabled: boolean) =>
  alova.Put<ResponseBody<AgentOwner>>(`admin/agent/accounts/${userId}`, { enabled });
