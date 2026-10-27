import { useBootstrapStore } from 'src/stores/bootstrap-store'
import { requestPinia } from 'src/utils/request-context'

/** Used until the API's settings arrive; admins can change the real lists. */
export const allowedAudioExts = ['.wav', '.flac', '.aiff', '.alac', '.ogg', '.mp2', '.mp3', '.aac', '.amr', '.wma', '.m4a']

export const allowedAssetsExts = [
  '.wav', '.flac', '.aiff', '.alac', '.ogg', '.mp2', '.mp3', '.aac', '.amr', '.wma', '.m4a',
  '.jpg', '.jpeg', '.png', '.svg', '.zip', '.pdf', '.txt', '.lrc',
]

/** The extensions the API takes, from its settings, so the app never offers a file it rejects. */
const fromSettings = (key: string, fallback: string[]): string[] => {
  const config = useBootstrapStore(requestPinia()).configuration as unknown as Record<string, unknown>
  let value = config?.[key]
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      value = null
    }
  }
  const list = Array.isArray(value) ? value.filter((e): e is string => typeof e === 'string' && !!e.trim()) : []

  return list.length ? list.map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase().trim()) : fallback
}

export const audioExts = () => fromSettings('allowed_audio_exts', allowedAudioExts)
export const assetsExts = () => fromSettings('allowed_assets_exts', allowedAssetsExts)

/**
 * The MIME types phones report for each extension. Android's file picker filters
 * by these, and apps disagree (audio/wav or audio/x-wav), so listing them all
 * keeps files from being hidden.
 */
const MIME_TYPES: Record<string, string[]> = {
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  '.flac': ['audio/flac', 'audio/x-flac'],
  '.aiff': ['audio/aiff', 'audio/x-aiff'],
  '.aif': ['audio/aiff', 'audio/x-aiff'],
  '.alac': ['audio/mp4', 'audio/x-m4a'],
  '.m4a': ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  '.ogg': ['audio/ogg', 'application/ogg'],
  '.opus': ['audio/opus', 'audio/ogg'],
  '.mp2': ['audio/mpeg'],
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.aac': ['audio/aac', 'audio/x-aac'],
  '.amr': ['audio/amr'],
  '.wma': ['audio/x-ms-wma'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.svg': ['image/svg+xml'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.lrc': ['text/plain'],
}

/** An input's accept value: the extensions plus the MIME types they come as. */
export const acceptFor = (exts: string[]) =>
  [...new Set([...exts, ...exts.flatMap((ext) => MIME_TYPES[ext] ?? [])])].join(',')

/** Whether a picked file is one of the extensions. */
export const hasExtension = (name: string, exts: string[]) => exts.some((ext) => name.toLowerCase().endsWith(ext))

export const privacyOptions = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
]

export const privacyOptionsExtended = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
  { label: 'Public Preview', value: 'public_preview' },
]

export const collabRoles = [
  {
    label: 'Producer',
    value: 'producer',
  },
  {
    label: 'Vocals',
    value: 'vocals',
  },
  {
    label: 'Drums',
    value: 'drums',
  },
  {
    label: 'Beats',
    value: 'beats',
  },
  {
    label: 'Piano',
    value: 'piano',
  },
  {
    label: 'Bass',
    value: 'bass',
  },
  {
    label: 'Guitar',
    value: 'guitar',
  },
  {
    label: 'Strings',
    value: 'strings',
  },
  {
    label: 'Winds',
    value: 'winds',
  },
  {
    label: 'Lead',
    value: 'lead',
  },
  {
    label: 'Custom',
    value: 'custom',
  }
]

export const collabRole = (role: string, custom?: string) => {
  const roles = collabRoles.reduce((acc: Record<string, string>, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  }, {})

  return roles[role] || custom || role?.titleCase() || 'Unknown'
};
