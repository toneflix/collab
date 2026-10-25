import { alova } from 'src/boot/alova';
import type { PageMeta, ResponseBody } from '../models';
import type { Sound } from './sounds';

/** Editor settings a writer keeps per song */
export type SongSettings = {
  autoSuggest: boolean;
  rhymeColours: boolean;
  mood: string | null;
  language: string | null;
  explicit: boolean;
};

/** A song written in Composer. Lists carry `excerpt` instead of the full text. */
export type Song = {
  id: number;
  title: string;
  /** The first two sung lines, in lists only */
  excerpt?: string[];
  body?: string;
  scratchpad?: string;
  notes?: string;
  bpm: number | null;
  key: string | null;
  beat?: Sound | null;
  settings: SongSettings;
  /** Goes up with every save; saves send the one they started from */
  revision: number;
  lineCount: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SongVersionKind = 'autosave' | 'named' | 'before_restore' | 'before_ai';

export type SongVersion = {
  id: number;
  title: string;
  body: string;
  kind: SongVersionKind;
  name: string | null;
  createdAt: string;
};

/** What a save sends: snake_case fields, settings included only when changed */
export type SongInput = {
  title?: string;
  body?: string;
  scratchpad?: string;
  notes?: string;
  bpm?: number | null;
  key?: string | null;
  beat_sound_id?: number | null;
  settings?: Partial<{
    auto_suggest: boolean;
    rhyme_colours: boolean;
    mood: string | null;
    language: string | null;
    explicit: boolean;
  }>;
};

type Page<T> = { data: T[]; meta: PageMeta };

export const loadSongsRequest = (page = 1, search = '') =>
  alova.Get<Page<Song>>('creator/songs', {
    params: { page, limit: 20, search: search || undefined },
    cacheFor: 0,
  });

export const createSongRequest = (data: SongInput = {}) =>
  alova.Post<ResponseBody<Song>>('creator/songs', data);

export const loadSongRequest = (id: string | number) =>
  alova.Get<ResponseBody<Song>>(`creator/songs/${id}`, { cacheFor: 0 });

export const saveSongRequest = (id: string | number, revision: number, data: SongInput) =>
  alova.Put<ResponseBody<Song>>(`creator/songs/${id}`, { ...data, revision });

export const deleteSongRequest = (id: string | number) =>
  alova.Delete<ResponseBody<Song>>(`creator/songs/${id}`);

export const loadSongVersionsRequest = (id: string | number, page = 1) =>
  alova.Get<Page<SongVersion>>(`creator/songs/${id}/versions`, {
    params: { page, limit: 20 },
    cacheFor: 0,
  });

export const nameSongVersionRequest = (id: string | number, name: string) =>
  alova.Post<ResponseBody<SongVersion>>(`creator/songs/${id}/versions`, { name });

export const restoreSongVersionRequest = (id: string | number, versionId: number) =>
  alova.Post<ResponseBody<Song>>(`creator/songs/${id}/versions/${versionId}/restore`);

/** A word from a lookup, with how many syllables it has when known */
export type WordHit = {
  word: string;
  syllables?: number;
  score?: number;
};

/** A word's syllables and rhyme sound, for the gutter and rhyme colours */
export type WordSound = {
  word: string;
  syllables: number;
  /** Stress per syllable, such as "010", for dictionary words */
  stress?: string;
  /** Vowels from the last stressed vowel; words sharing it rhyme */
  vowelKey?: string;
  known: boolean;
};

export type Definition = {
  partOfSpeech: string | null;
  text: string;
};

export type RhymeType = 'perfect' | 'near' | 'sounds' | 'multi';
export type RelatedType = 'means' | 'follows' | 'triggers';

/** Lookups say where their words came from, so Datamuse can be credited */
type Lookup<T> = { data: T[]; source: 'datamuse' | 'local' };

const word = (w: string) => `words/${encodeURIComponent(w.trim().toLowerCase())}`;

export const completeWordRequest = (q: string, limit = 8) =>
  alova.Get<Lookup<WordHit>>('words/complete', { params: { q, limit }, cacheFor: 5 * 60 * 1000 });

export const rhymesRequest = (w: string, type: RhymeType = 'perfect') =>
  alova.Get<Lookup<WordHit>>(`${word(w)}/rhymes`, { params: { type, limit: 80 }, cacheFor: 10 * 60 * 1000 });

export const relatedWordsRequest = (w: string, type: RelatedType = 'means') =>
  alova.Get<Lookup<WordHit>>(`${word(w)}/related`, { params: { type, limit: 60 }, cacheFor: 10 * 60 * 1000 });

export const definitionsRequest = (w: string) =>
  alova.Get<Lookup<Definition>>(`${word(w)}/definitions`, { cacheFor: 10 * 60 * 1000 });

export const wordSoundsRequest = (words: string[]) =>
  alova.Post<{ data: WordSound[] }>('words/syllables', { words });

export type SuggestionKind = 'line' | 'block' | 'verse' | 'rewrite';

/** Options from Composer's AI for a spot in the lyrics, with what they cost */
export type LyricSuggestion = {
  kind: SuggestionKind;
  /** The line the options are for, counted from 1 */
  line: number;
  options: { lines: string[] }[];
  credits: number;
  /** Credits left after this ask */
  balance: number;
};

export const suggestLyricsRequest = (
  id: string | number,
  data: { kind: SuggestionKind; line: number; body?: string; instruction?: string },
) => alova.Post<ResponseBody<LyricSuggestion>>(`creator/songs/${id}/suggestions`, data);
