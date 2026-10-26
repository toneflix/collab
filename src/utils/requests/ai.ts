import { alova, axios } from 'src/boot/alova';
import type { EnvKey, PageMeta, ResponseBody, SettingField } from '../models';

export type CreditPack = { credits: number; discount: number; price: number };

export type ReferenceKind = 'song' | 'voice' | 'instrumental';

/** A service AI tools run on */
export type AiEngine = 'replicate' | 'suno' | 'cloudflare';

/** A music generation model, what it can do and what it costs */
export type MusicModel = {
  id: string;
  name: string;
  engine: AiEngine;
  description: string;
  /** Credits charged per 10 seconds asked for, or once per song */
  pricing: 'per10s' | 'song';
  credits: number;
  /** The admin setting that holds its credits */
  creditsSetting: string;
  minSeconds: number;
  /** Longest track people can ask for; empty when the model picks the length */
  maxSeconds: number | null;
  promptLength: [number, number];
  /** Shortest and longest lyrics; empty when the model takes none */
  lyricsLength: [number, number] | null;
  /** Whether lyrics must be given; when not, the model writes its own */
  lyricsRequired: boolean;
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
  /** Credits per split into stems, per lyrics transcription, per section edit and per Composer suggestion */
  costs: {
    stems: number;
    lyrics: number;
    edit?: number;
    composer?: Record<'line' | 'block' | 'verse' | 'rewrite', number>;
  };
  /** The model music is generated with */
  music: MusicModel;
  /** The engine stems are split on */
  stemsEngine: AiEngine;
  /** The engine that rewrites a section of a stem, and the sections it can take */
  edit?: SectionEditLimits;
  /** Which engines have their key set */
  engines: Record<AiEngine, boolean>;
};

export type SectionEditLimits = {
  engine: AiEngine;
  /** The shortest part the engine rewrites; shorter selections are rewritten with what's around them */
  minSeconds: number;
  /** The largest share of the audio sent to the engine that the part may be */
  maxShare: number;
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

/** One of the versions a music model made, waiting for a pick */
export type SongVersion = {
  index: number;
  title?: string | null;
  duration?: number | null;
  image?: string | null;
  /** A link that plays it; empty once a version was picked or they expired */
  url?: string | null;
};

export type AiJob = {
  id: number;
  kind: 'music' | 'stems' | 'lyrics' | 'edit';
  status: AiJobStatus;
  trackId: number;
  prompt?: string | null;
  /** The music model's name */
  model?: string | null;
  seconds?: number | null;
  split: boolean;
  /** The stem a split or transcription worked on */
  title?: string | null;
  /** The part of the stem's audio a section edit rewrote, in seconds */
  section?: { start: number; end: number } | null;
  /** The stem a split, transcription or section edit worked on */
  stemId?: number | null;
  /** The stem a section edit muted, now that its copy plays instead */
  muted?: number | null;
  /** Lines of lyrics a transcription wrote */
  lines?: number | null;
  credits: number;
  /** Ids of the stems it made */
  stems: number[];
  error?: string | null;
  /** Something that went wrong in a job that still finished, like a failed split */
  notice?: string | null;
  /** Versions of the song to pick from, when the model made several */
  versions?: SongVersion[] | null;
  /** The version picked for the track */
  chosen?: number | null;
  /** The version on its way to the track */
  choosing?: number | null;
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
  keys: Record<AiEngine, EnvKey[]> & { datamuse?: EnvKey[] };
  client: AiConfig;
  /** Every music model admins can switch to */
  models: MusicModel[];
  options: {
    /** Suno model versions, id to label */
    sunoVersions: Record<string, string>;
    /** Kinds of Suno stem splits, id to label */
    sunoStemTypes: Record<string, string>;
    engines: Record<AiEngine, string>;
    /** The engines each switchable tool can run on, by its setting */
    toolEngines?: Record<string, AiEngine[]>;
    /** Where Composer's word lookups come from, id to label */
    wordSources?: Record<string, string>;
    /** Music models that sing lyrics, which Composer songs can use */
    composerMusicModels?: string[];
  };
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

/** A part of a stem to rewrite, in seconds of its audio file */
export type SectionEditForm = {
  prompt: string;
  lyrics?: string;
  start: number;
  end: number;
};

export const editSectionRequest = (
  projectId: string | number,
  trackId: string | number,
  stemId: string | number,
  form: SectionEditForm,
) =>
  alova.Post<ResponseBody<AiJob>>(
    `${track(projectId, trackId)}/stems/${stemId}/edit`,
    form,
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

/** Put the picked version of a generated song on its track */
export const chooseVersionRequest = (jobId: number, index: number) =>
  alova.Post<ResponseBody<AiJob>>(`creator/ai/jobs/${jobId}/versions/${index}`);

/** Whether a job is done from its owner's side: failed, or added to the track */
export const jobDone = (job: AiJob) =>
  job.status === 'failed' ||
  (job.status === 'succeeded' && !(job.versions?.length && job.chosen == null));

/** Whether a job's versions are waiting for a pick */
export const awaitingPick = (job: AiJob) =>
  job.status === 'succeeded' &&
  !!job.versions?.length &&
  job.chosen == null &&
  job.versions.some((v) => !!v.url);

export const loadAiSettingsRequest = () =>
  alova.Get('admin/ai', {
    transform: (e: ResponseBody<AiAdminSettings>) => e.data,
    cacheFor: 0,
  });

export const saveAiSettingsRequest = (
  form: Record<string, string | number | boolean | null>,
) => alova.Put<ResponseBody<AiAdminSettings>>('admin/ai', form);
