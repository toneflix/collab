import type { Release, Track, UploadData } from 'src/utils/models';

/**
 * A release from the API, with the field names the release form sends.
 */
export const releaseFormFields = (release: Release): Release & UploadData => {
  return Object.assign(release, {
    genre_id: release.genreId,
    artist_id: release.artistId,
    project_id: release.projectId,
    record_label: release.recordLabel,
    contains_music: release.containsMusic ? 1 : 0,
    downloadable: release.downloadable ? 1 : 0,
    topic_ids: (release.topics ?? []).map((topic) => topic.id),
  } as UploadData);
};

/**
 * A track from the API, with the field names the release form sends for its tracks.
 */
export const trackFormFields = (track: Track): Track & UploadData => {
  return Object.assign(track, {
    genre_id: track.genreId,
    artist_id: track.artistId,
    featured: track.featured ?? [],
    project_track_id: track.projectTrackId,
    contains_music: track.containsMusic ? 1 : 0,
    stems_price: track.stemsPrice ?? 0,
  } as UploadData);
};
