import type { ArtistCredit, Track } from 'src/utils/models';

/**
 * Names joined the way credits read: "A", "A & B", "A, B & C".
 */
export const joinNames = (names: string[]): string =>
  names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;

/**
 * The track's artists as one line, like "Dave feat. Daniel & Ada".
 */
export const artistCredit = (track: Pick<Track, 'artist' | 'featured'>, fallback = ''): string => {
  const main = track.artist?.name || fallback;
  const featured = (track.featured ?? []).map((artist: ArtistCredit) => artist.name);

  return featured.length ? `${main} feat. ${joinNames(featured)}` : main;
};
