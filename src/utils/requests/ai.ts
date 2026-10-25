import { alova } from 'src/boot/alova';
import type { EnvKey, ResponseBody, SettingField } from '../models';

export type CreditPack = { credits: number; discount: number; price: number };

/** What the AI tools cost and whether they're on */
export type AiConfig = {
  enabled: boolean;
  creditPrice: number;
  packs: CreditPack[];
  /** Credits per 10 seconds of music, per split into stems, and per lyrics transcription */
  costs: { music10s: number; stems: number; lyrics: number };
  musicMaxSeconds: number;
};

export type CreditBalance = {
  /** Plan credits each month */
  allowance: number;
  planUsed: number;
  planLeft: number;
  /** Bought credits, which never expire */
  purchased: number;
  total: number;
  /** When plan credits start over */
  resetsAt: string;
};

export type AiAccount = AiConfig & {
  /** Whether the user's plan includes AI tools */
  access: boolean;
  balance: CreditBalance;
};

export type CreditEntry = {
  id: number;
  type: 'purchase' | 'spend' | 'refund' | 'grant';
  credits: number;
  description: string | null;
  createdAt: string;
};

export type AiJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type AiJob = {
  id: number;
  kind: 'music' | 'stems' | 'lyrics';
  status: AiJobStatus;
  trackId: number;
  prompt?: string | null;
  seconds?: number | null;
  split: boolean;
  /** The stem a split or transcription worked on */
  title?: string | null;
  /** Lines of lyrics a transcription wrote */
  lines?: number | null;
  credits: number;
  /** Ids of the stems it made */
  stems: number[];
  error?: string | null;
  /** Something that went wrong in a job that still finished, like a failed split */
  notice?: string | null;
  createdAt: string;
  finishedAt?: string | null;
};

export type MusicForm = {
  prompt: string;
  seconds: number;
  instrumental: boolean;
  split: boolean;
  seed?: number | null;
};

export type AiAdminSettings = {
  fields: Record<string, SettingField>;
  keys: { replicate: EnvKey[] };
  client: AiConfig;
  currency: string;
};

const track = (projectId: string | number, trackId: string | number) =>
  `creator/projects/${projectId}/tracks/${trackId}`;

/** Credits a music job uses, matching the API's sums */
export const musicCost = (
  config: Pick<AiConfig, 'costs'>,
  seconds: number,
  split: boolean,
) =>
  Math.max(1, Math.ceil((seconds / 10) * config.costs.music10s)) +
  (split ? config.costs.stems : 0);

export const loadAiAccountRequest = () =>
  alova.Get('account/ai', {
    transform: (e: ResponseBody<AiAccount>) => e.data,
    cacheFor: 0,
  });

export const loadCreditHistoryRequest = (page = 1) =>
  alova.Get<{
    data: CreditEntry[];
    meta: { total: number; page: number; lastPage: number };
  }>('account/ai/history', {
    params: { page, limit: 20 },
    cacheFor: 0,
  });

export const generateMusicRequest = (
  projectId: string | number,
  trackId: string | number,
  form: MusicForm,
) =>
  alova.Post<ResponseBody<AiJob>>(
    `${track(projectId, trackId)}/ai/music`,
    form,
  );

export const splitStemRequest = (
  projectId: string | number,
  trackId: string | number,
  stemId: string | number,
) =>
  alova.Post<ResponseBody<AiJob>>(
    `${track(projectId, trackId)}/stems/${stemId}/split`,
  );

export const loadAiJobsRequest = (
  projectId: string | number,
  trackId: string | number,
) =>
  alova.Get(`${track(projectId, trackId)}/ai/jobs`, {
    transform: (e: ResponseBody<AiJob[]>) => e.data,
    cacheFor: 0,
  });

export const loadAiJobRequest = (id: number) =>
  alova.Get(`creator/ai/jobs/${id}`, {
    transform: (e: ResponseBody<AiJob>) => e.data,
    cacheFor: 0,
  });

export const loadAiSettingsRequest = () =>
  alova.Get('admin/ai', {
    transform: (e: ResponseBody<AiAdminSettings>) => e.data,
    cacheFor: 0,
  });

export const saveAiSettingsRequest = (
  form: Record<string, string | number | boolean | null>,
) => alova.Put<ResponseBody<AiAdminSettings>>('admin/ai', form);
