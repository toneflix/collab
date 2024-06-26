export const allowedAudioExts = ['.wav', '.flac', '.aiff', '.alac', '.ogg', '.mp2', '.mp3', '.aac', '.amr', '.wma']

export const allowedAssetsExts = [
  '.wav', '.flac', '.aiff', '.alac', '.ogg', '.mp2', '.mp3', '.aac', '.amr', '.wma',
  '.jpg', '.jpeg', '.png', '.svg', '.zip', '.pdf', '.txt', '.lrc',
]

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
    label: 'Custom',
    value: 'custom',
  }
]

export const collabRole = (role: string, custom?: string) => {
  const roles = collabRoles.reduce((acc: Record<string, string>, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  }, {})

  return roles[role] || custom || 'Unknown'
};
