import { defineStore } from 'pinia'
import { arrayUnique } from 'src/utils/helpers'
import { Track } from 'src/utils/models'

export const useGlobalStore = defineStore('global', {
  persist: true,
  state: () => {
    return {
      volume: 45,
      playMode: <'single' | 'loop' | 'all'>'loop',
      playlist: {
        id: <string | number>1,
        tracks: <Track[]>[]
      },
      isSidebarMinimized: false,
    }
  },

  actions: {
    toggleSidebar () {
      this.isSidebarMinimized = !this.isSidebarMinimized
    },
    setPlayMode () {
      const modes: typeof this.playMode[] = [
        'single',
        'loop',
        'all',
      ]
      const i = modes.findIndex(e => e === this.playMode) + 1
      this.playMode = modes[i > 2 ? 0 : i]
    },
    clearPlaylist () {
      this.playlist.id = new Date().getTime()
      this.playlist.tracks = []
    },
    addToPlaylist (track: Track | Track[]) {
      let tracks = [...this.playlist.tracks]

      if (Array.isArray(track)) {
        this.playlist.id = new Date().getTime()
        tracks = track
      } else {
        tracks.push(track);
      }

      this.playlist.tracks = arrayUnique(tracks as unknown as Record<string, string>[]) as unknown as Track[]
    },
    removeFromPlaylist (item: string | number | Track) {
      let id: number;

      if (typeof item === 'string') {
        id = parseInt(item)
      }

      if (typeof item === 'object') {
        id = item.id as number
      }

      this.playlist.tracks = this.playlist.tracks.filter(e => e.id !== id)
    },
  },
})
