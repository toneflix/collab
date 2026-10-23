import { defineStore } from 'pinia'

/**
 * App-wide UI settings. Playback lives in the player store.
 */
export const useGlobalStore = defineStore('global', {
  persist: {
    pick: ['dawWarning', 'isSidebarMinimized'],
  },
  state: () => {
    return {
      dawWarning: true,
      isSidebarMinimized: false,
    }
  },

  actions: {
    toggleSidebar () {
      this.isSidebarMinimized = !this.isSidebarMinimized
    },
  },
})
