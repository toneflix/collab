import { Initialize, PageData } from 'src/utils/models';
import { defineStore } from 'pinia';

export const useBootstrapStore = defineStore('bootstrap', {
  state: () => ({
    pageData: <PageData>{},
    settings: <Initialize>{},
  }),

  getters: {
    getCache (state) {
      return state.pageData.cache;
    }
  },

  actions: {
    setCache (data: Record<string, string>) {
      this.pageData.cache = data;
    }
  }
});
