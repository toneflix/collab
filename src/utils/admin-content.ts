import type { ContentKind } from './requests/adminContent'

export type ContentFieldKind =
  | 'text'
  | 'textarea'
  | 'lyrics'
  | 'number'
  | 'date'
  | 'toggle'
  | 'select'
  | 'genre'
  | 'owner'
  | 'artist'
  | 'release'
  | 'image'
  | 'audio'

export type ContentField = {
  /** The request field */
  key: string;
  /** Where the value comes from in the item's `fields` */
  from: string;
  label: string;
  kind: ContentFieldKind;
  required?: boolean;
  /** Required only when adding */
  requiredOnCreate?: boolean;
  /** Only shown when adding */
  createOnly?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Width over height, for image fields */
  aspect?: number;
  max?: number;
}

export type ContentSection = {
  key: ContentKind;
  icon: string;
  title: string;
  /** One item, for buttons like "Add album" */
  noun: string;
  caption: string;
  statuses: { value: string; label: string }[];
  fields: ContentField[];
}

const privacy = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
]

const taken = { value: 'taken_down', label: 'Taken down' }

/** How a track was made, which weighs its stream earnings */
export const trackOrigins = [
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'recorded', label: 'Recorded' },
  { value: 'agentic', label: 'Agentic' },
]

export const contentSections: ContentSection[] = [
  {
    key: 'track',
    icon: 'lucide-music',
    title: 'Tracks',
    noun: 'track',
    caption: 'Released tracks and their audio',
    statuses: [
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' },
      { value: 'no_audio', label: 'No audio' },
      { value: 'unranked', label: 'Unranked' },
      ...trackOrigins,
      taken,
    ],
    fields: [
      { key: 'image', from: 'imageUrl', label: 'Artwork', kind: 'image', aspect: 1 },
      { key: 'release_id', from: 'releaseId', label: 'Album', kind: 'release', required: true },
      { key: 'title', from: 'title', label: 'Title', kind: 'text', required: true, max: 150 },
      { key: 'artist_id', from: 'artistId', label: 'Artist', kind: 'artist', hint: "The album's artist when left empty" },
      { key: 'genre_id', from: 'genreId', label: 'Genre', kind: 'genre', required: true },
      { key: 'audio', from: 'hasAudio', label: 'Audio', kind: 'audio', requiredOnCreate: true },
      { key: 'privacy', from: 'privacy', label: 'Privacy', kind: 'select', options: privacy },
      { key: 'stems_price', from: 'stemsPrice', label: 'Stems price', kind: 'number' },
      {
        key: 'origin',
        from: 'origin',
        label: 'Rank',
        kind: 'select',
        hint: 'Your pick stays until set back to Automatic',
        options: [{ value: '', label: 'Automatic' }, ...trackOrigins],
      },
      { key: 'description', from: 'description', label: 'Description', kind: 'textarea', max: 5000 },
    ],
  },
  {
    key: 'release',
    icon: 'lucide-disc-3',
    title: 'Albums',
    noun: 'album',
    caption: 'Albums and singles',
    statuses: [
      { value: 'live', label: 'Live' },
      { value: 'draft', label: 'Draft' },
      { value: 'review', label: 'In review' },
      { value: 'retired', label: 'Retired' },
      taken,
    ],
    fields: [
      { key: 'artwork', from: 'imageUrl', label: 'Artwork', kind: 'image', aspect: 1 },
      { key: 'user_id', from: 'userId', label: 'Owner', kind: 'owner', required: true },
      { key: 'title', from: 'title', label: 'Title', kind: 'text', required: true, max: 150 },
      { key: 'version', from: 'version', label: 'Version', kind: 'text', max: 60 },
      { key: 'artist_id', from: 'artistId', label: 'Artist', kind: 'artist', required: true },
      { key: 'genre_id', from: 'genreId', label: 'Genre', kind: 'genre', required: true },
      { key: 'release_date', from: 'releaseDate', label: 'Release date', kind: 'date' },
      { key: 'record_label', from: 'recordLabel', label: 'Record label', kind: 'text', max: 150 },
      { key: 'privacy', from: 'privacy', label: 'Privacy', kind: 'select', options: privacy },
      { key: 'price', from: 'price', label: 'Price', kind: 'number' },
      { key: 'description', from: 'description', label: 'Description', kind: 'textarea', max: 5000 },
      { key: 'published', from: 'published', label: 'Published', kind: 'toggle' },
      { key: 'explicit', from: 'explicit', label: 'Explicit', kind: 'toggle' },
      { key: 'downloadable', from: 'downloadable', label: 'Downloadable', kind: 'toggle' },
    ],
  },
  {
    key: 'song',
    icon: 'lucide-quote',
    title: 'Compositions',
    noun: 'composition',
    caption: 'Lyrics written in Composer',
    statuses: [{ value: 'published', label: 'Published' }, { value: 'private', label: 'Private' }, taken],
    fields: [
      { key: 'image', from: 'imageUrl', label: 'Artwork', kind: 'image', aspect: 1 },
      { key: 'user_id', from: 'userId', label: 'Writer', kind: 'owner', requiredOnCreate: true, createOnly: true },
      { key: 'title', from: 'title', label: 'Title', kind: 'text', required: true, max: 150 },
      { key: 'body', from: 'body', label: 'Lyrics', kind: 'lyrics', max: 20000 },
      { key: 'published', from: 'published', label: 'Published', kind: 'toggle' },
      { key: 'allow_forks', from: 'allowForks', label: 'Others can fork it', kind: 'toggle' },
      { key: 'allow_projects', from: 'allowProjects', label: 'Others can make it a project', kind: 'toggle' },
    ],
  },
  {
    key: 'project',
    icon: 'lucide-folder',
    title: 'Projects',
    noun: 'project',
    caption: 'Studio projects',
    statuses: [{ value: 'open', label: 'Public' }, { value: 'private', label: 'Private' }, taken],
    fields: [
      { key: 'image', from: 'imageUrl', label: 'Image', kind: 'image', aspect: 1 },
      { key: 'user_id', from: 'userId', label: 'Owner', kind: 'owner', required: true },
      { key: 'title', from: 'title', label: 'Title', kind: 'text', required: true, max: 150 },
      {
        key: 'privacy',
        from: 'privacy',
        label: 'Privacy',
        kind: 'select',
        options: [
          { value: 'private', label: 'Private' },
          { value: 'public', label: 'Public' },
          { value: 'public_preview', label: 'Public preview' },
        ],
      },
      { key: 'description', from: 'description', label: 'Description', kind: 'textarea', max: 5000 },
      { key: 'tracks_public', from: 'tracksPublic', label: 'Every track public', kind: 'toggle' },
    ],
  },
  {
    key: 'artist',
    icon: 'lucide-mic-vocal',
    title: 'Artists',
    noun: 'artist',
    caption: 'Artist profiles',
    statuses: [{ value: 'verified', label: 'Verified' }, { value: 'unverified', label: 'Not verified' }, { value: 'unclaimed', label: 'Unclaimed' }],
    fields: [
      { key: 'image', from: 'imageUrl', label: 'Photo', kind: 'image', aspect: 1 },
      { key: 'cover', from: 'coverUrl', label: 'Cover photo', kind: 'image', aspect: 2 },
      { key: 'user_id', from: 'userId', label: 'Managed by', kind: 'owner', hint: 'Empty for an artist anyone can claim' },
      { key: 'name', from: 'name', label: 'Name', kind: 'text', required: true, max: 100 },
      { key: 'about', from: 'about', label: 'About', kind: 'textarea', max: 2000 },
      { key: 'verified', from: 'verified', label: 'Verified', kind: 'toggle' },
    ],
  },
]

export const contentSection = (key: ContentKind) => contentSections.find((section) => section.key === key) as ContentSection
