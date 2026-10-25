import { alova, axios } from 'src/boot/alova';
import type { EnvKey, PageMeta, ResponseBody, SettingField } from '../models';

export type CreditPack = { credits: number; discount: number; price: number };

export type ReferenceKind = 'song' | 'voice' | 'instrumental';

/** A music generation model, what it can do and what it costs */
export type MusicModel = {
  id: string;
  name: string;
  description: string;
  /** Credits charged per 10 seconds asked for, or once per song */
  pricing: 'per10s' | 'song';
  credits: number;
  /** The admin setting that holds its credits */
  creditsSetting: string;
  /** Longest track people can ask for; empty when the model picks the length */
  maxSeconds: number | null;
  promptLength: [number, number];
  /** Shortest and longest lyrics; empty when the model takes none */
  lyricsLength: [number, number] | null;
  /** Whether people can ask for no vocals */
  instrumentalOption: boolean;
  /** Whether it only makes instrumentals */
  instrumentalOnly: boolean;
  references: ReferenceKind[];
  referenceMinSeconds: number;
};

/** What the AI tools cost and whether they're on */
export type AiConfig = {
  enabled: boolean;
  creditPrice: number;
  packs: CreditPack[];
  /** Credits per split into stems and per lyrics transcription */
  costs: { stems: number; lyrics: number };
  /** The model music is generated with */
  music: MusicModel;
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
  /** The music model's name */
  model?: string | null;
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
  lyrics?: string;
  seconds?: number;
  instrumental?: boolean;
  split: boolean;
  seed?: number | null;
  /** Reference audio: an uploaded file or a stem on the track */
  reference?: File | null;
  reference_stem_id?: string | number | null;
  reference_kind?: ReferenceKind;
};

export type AiAdminSettings = {
  fields: Record<string, SettingField>;
  keys: { replicate: EnvKey[] };
  client: AiConfig;
  /** Every music model admins can switch to */
  models: MusicModel[];
  currency: string;
};

const track = (projectId: string | number, trackId: string | number) =>
  `creator/projects/${projectId}/tracks/${trackId}`;

/** Credits a music job uses, matching the API's sums */
export const musicCost = (
  config: Pick<AiConfig, 'costs' | 'music'>,
  seconds: number,
  split: boolean,
) =>
  (config.music.pricing === 'per10s'
    ? Math.max(1, Math.ceil((seconds / 10) * config.music.credits))
    : config.music.credits) + (split ? config.costs.stems : 0);

/** A model's price in words, like "5 credits per 10 seconds" */
export const musicPrice = (model: Pick<MusicModel, 'pricing' | 'credits'>) =>
  `${model.credits} credits per ${model.pricing === 'per10s' ? '10 seconds' : 'song'}`;

export const loadAiAccountRequest = () =>
  alova.Get('account/ai', {
    transform: (e: ResponseBody<AiAccount>) => e.data,
    cacheFor: 0,
  });

export const loadCreditHistoryRequest = (page = 1) =>
  alova.Get<ResponseBody<CreditEntry[]> & { meta: PageMeta }>('account/ai/history', {
    params: { page, limit: 20 },
    cacheFor: 0,
  });

export const generateMusicRequest = (
  projectId: string | number,
  trackId: string | number,
  form: MusicForm,
) => {
  if (!form.reference) {
    return alova.Post<ResponseBody<AiJob>>(`${track(projectId, trackId)}/ai/music`, { ...form, reference: undefined });
  }

  // A reference file goes up as multipart, where true and false must be 1 and 0.
  const data = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    data.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : value instanceof File ? value : String(value));
  });

  const request = axios.Post<ResponseBody<AiJob>>(`${track(projectId, trackId)}/ai/music`, data);
  request.config.headers['Content-Type'] = 'multipart/form-data';
  return request;
};

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
