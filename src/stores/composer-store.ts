import { defineStore } from 'pinia';
import type { Song, SongInput } from 'src/utils/requests/composer';

/** Unsaved changes to a song, kept in the browser until the writer saves */
export type SongDraft = {
  /** What a save sends */
  input: SongInput;
  /** The same changes in the shape the page shows */
  patch: Partial<Song>;
  /** The revision the changes were made on */
  revision: number;
  updatedAt: string;
};

/**
 * Composer drafts. Edits land here as the writer types and reach the server
 * only when they save, so work survives a closed tab without a request per pause.
 */
export const useComposerStore = defineStore('composer', {
  persist: {
    pick: ['drafts'],
  },

  state: () => ({
    drafts: {} as Record<string, SongDraft>,
  }),

  actions: {
    draft(songId: number | string): SongDraft | null {
      return this.drafts[String(songId)] ?? null;
    },

    keep(songId: number | string, draft: Omit<SongDraft, 'updatedAt'>) {
      this.drafts[String(songId)] = { ...draft, updatedAt: new Date().toISOString() };
    },

    discard(songId: number | string) {
      delete this.drafts[String(songId)];
    },
  },
});
