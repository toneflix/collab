/** Style ideas for Generate music. The panel shows a few at random. */
export const MUSIC_STYLES = [
  'Mellow afrobeats groove with guitars and log drums',
  'Lofi hip hop beat with vinyl crackle and soft keys',
  'Amapiano loop with shakers and a deep log drum bass',
  'Uplifting gospel choir with organ and claps',
  'Highlife band with bright palm-wine guitars and horns',
  'Afro-fusion slow jam with warm pads and talking drum',
  'Street-hop banger with heavy 808s and chant hooks',
  'Fuji-inspired percussion with sakara drums and call and response',
  'Juju groove with layered guitars and talking drum',
  'Afro-house track with rolling percussion and airy vocals',
  'Gqom beat with dark synths and broken kicks',
  'Bongo flava love song with marimba and soft harmonies',
  'Kwaito groove with deep house bass and chanted vocals',
  'Soukous dance track with sparkling guitar runs',
  'Afro-soul ballad with Rhodes piano and strings',
  'Dancehall riddim with offbeat stabs and a booming bass',
  'Roots reggae with skank guitar, organ bubble and dub delays',
  'Trap beat with rolling hi-hats and dark piano',
  'Boom bap hip hop with dusty drums and a jazz sample',
  'Drill beat with sliding 808s and eerie choir',
  'R&B slow jam with silky vocals and finger snaps',
  'Neo-soul groove with live bass and lush chords',
  'Pop anthem with big drums, synths and a catchy hook',
  'Synthwave track with retro arpeggios and gated drums',
  'Indie folk song with acoustic guitar and soft harmonies',
  'Acoustic love song with fingerpicked guitar and cello',
  'Cinematic orchestral score with swelling strings and brass',
  'Ambient soundscape with evolving pads and gentle piano',
  'Deep house groove with warm bass and chopped vocals',
  'Melodic techno with pulsing synths and driving kicks',
  'Drum and bass with fast breakbeats and a rolling sub',
  'Jazz trio with brushed drums, upright bass and piano',
  'Smooth jazz with saxophone lead and soft keys',
  'Bossa nova with nylon guitar and light percussion',
  'Latin reggaeton with dembow rhythm and bright synths',
  'Salsa band with piano montuno, congas and horns',
  'Country ballad with steel guitar and heartfelt vocals',
  'Blues shuffle with gritty guitar and harmonica',
  'Rock anthem with distorted guitars and pounding drums',
  'Funk groove with slap bass, wah guitar and horns',
  'Disco track with four-on-the-floor beat and string stabs',
  'K-pop dance track with punchy synths and layered vocals',
  'Bollywood dance number with dhol and soaring strings',
  'Worship ballad with piano, pads and a big chorus',
  'Children’s song with ukulele, glockenspiel and claps',
  'Epic trailer music with taiko drums and choir',
];

/** `count` styles in random order */
export const pickStyles = (count = 4) =>
  [...MUSIC_STYLES]
    .map((style) => ({ style, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .map(({ style }) => style);
