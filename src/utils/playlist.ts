import { ShallowRef } from 'vue'
import { PlaylistState } from './models'
import { TrackFade, TrackStates } from 'app/models/wave-playlist.d'
import Playlist from 'waveform-playlist/lib/Playlist'

export type WavePlaylistTrack = {
  src: string | File,
  end: number,
  name: string,
  type: 'stem' | 'asset',
  gain: number,
  meta?: WavePlaylistTrack,
  fades: Record<string, TrackFade>
  muted: boolean,
  start: number,
  soloed: boolean,
  endTime: number,
  duration: number,
  startTime: number,
  stereoPan: number,
  cuein: number,
  cueIn: number,
  cueout: number,
  cueOut: number,
  customClass: string,
  waveOutlineColor: string,
  fadeIn: TrackFade,
  fadeOut: TrackFade,
  states: TrackStates,
  enabledStates: TrackStates,
  selected: {
    start: number,
    end: number,
  },
  getTrackDetails (): WavePlaylistTrack
}

export const playlistEvents = [
  'trim',
  'mute',
  'solo',
  'shift',
  'fadein',
  'fadeout',
  'stereopan',
  'removeTrack',
  'volumechange',
]

export const playlistStates = [
  { label: 'Cursor', value: <PlaylistState>'cursor', icon: 'fas fa-i-cursor', },
  { label: 'Select', value: <PlaylistState>'select', icon: 'fas fa-hand-pointer', },
  { label: 'Shift', value: <PlaylistState>'shift', icon: 'fas fa-arrows-left-right', },
  { label: 'Fadein', value: <PlaylistState>'fadein', icon: 'flip', class: 'rotate-180' },
  { label: 'Fadeout', value: <PlaylistState>'fadeout', icon: 'flip' }
]

export const rebuildPlaylist = (playlist: ShallowRef<Playlist>) => {
  return new Promise<WavePlaylistTrack[]>(resolve => {
    const list: WavePlaylistTrack[] = []

    if (Array.isArray(playlist.value.tracks)) {
      playlist.value.tracks.forEach((track, i) => {
        if (typeof track === 'string') {
          return
        }

        const data = track.getTrackDetails() as unknown as WavePlaylistTrack
        list[i] = <WavePlaylistTrack>{
          src: track.src,
          end: Number(track.endTime),
          name: track.name,
          type: 'stem',
          gain: Number(track.gain),
          cuein: Number(track.cueIn),
          muted: Boolean(track.muted),// TODO: recheck
          cueout: Number(track.cueOut),
          soloed: Boolean(track.soloed),// TODO: recheck
          start: Number(track.startTime),
          duration: Number(track.duration),
          fadeIn: data.fadeIn ? {
            shape: data.fadeIn.shape,
            duration: Math.max(0, Number(data.fadeIn.duration))
          } : undefined,
          fadeOut: data.fadeOut ? {
            shape: data.fadeOut.shape,
            duration: Math.max(0, Number(data.fadeOut.duration))
          } : undefined,
          stereoPan: Number(track.stereoPan),
          enabledStates: track.enabledStates,
        }
      });

      resolve(list)
    }
  });
}
