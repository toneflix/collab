import { defineStore } from 'pinia'
import { arrayUnique } from 'src/utils/helpers'
import { Track } from 'src/utils/models'
import SystemPlaylist from 'src/utils/SystemPlaylist'

export const useGlobalStore = defineStore('global', {
  persist: true,
  state: () => {
    return {
      mute: false,
      volume: 45,
      playMode: <'single' | 'loop' | 'all'>'loop',
      playlist: new SystemPlaylist<Track>(),
      dawWarning: true,
      currentTrack: <Track | null>null,
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
    setCurrentTrack (track: Track) {
      this.currentTrack = track
    },
    setPlaylistId (id: string) {
      this.playlist.id = id
    },
    clearPlaylist () {
      this.playlist.id = new Date().getTime()
      this.playlist.clear()
    },
    addToPlaylist (track: Track | Track[]) {
      let tracks = []

      if (Array.isArray(track)) {
        tracks = track
      } else {
        tracks = [...this.playlist.items as Track[], track]
      }

      this.playlist.insertItems(
        arrayUnique(tracks as unknown as Record<string, string>[]) as unknown as Track[],
        true
      )
    },
    removeFromPlaylist (item: string | number | Track) {
      let id: number;

      if (typeof item === 'string') {
        id = parseInt(item)
      }

      if (typeof item === 'object') {
        id = item.id as number
      }

      this.playlist.filter(e => e.id !== id)
      // this.playlist.tracks = this.playlist.tracks.filter(e => e.id !== id)
    },
  },
})
