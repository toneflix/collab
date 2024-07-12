import {
  Artist,
  Collaber,
  ExploreData,
  FileAsset,
  GenericData,
  Project,
  ProjectTrack,
  Release,
  ResponseBody,
  Track,
  UploadData,
  User,
  UserComment
} from './models'
import { alova, axios } from 'src/boot/alova'

import { WavePlaylistTrack } from './playlist'
import { toRaw } from 'vue'

/**
 * Fetch initial data for the app based on the parameters passed
 *
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const exploreRequest = (params?: GenericData) => {
  return alova.Get('explore', {
    transformData: (e: ResponseBody<ExploreData>) => e.data,
    hitSource: 'play-track',
    params
  })
}

/**
 * Fetch all [project] comments
 *
 * @param pid The ID of the project
 * @param id If fetching replies, pass the ID of the comment
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const loadCommentsRequest = (
  pid: string | string[],
  id?: string | string[],
  params?: GenericData
) => {
  const baseUrl = params?.baseUrl ? params.baseUrl : 'projects'
  return alova.Get<ResponseBody<UserComment[]>>(`${baseUrl}/${pid}/comments${id ? `/${id}` : ''}`, {
    hitSource: 'add-project-comment',
    params
  })
}

/**
 * Write a comment
 *
 * @param f The form data object
 * @returns
 */
export const writeCommentsRequest = (
  f: { comment: string, image?: File, id?: number | string },
  pid: string | string[],
  params?: GenericData) => {
  const form = {
    image: f.image,
    comment: f.comment,
    _method: f.id ? 'PUT' : 'POST',
  }

  const baseUrl = params?.baseUrl ? params.baseUrl : 'projects'

  const request = axios.Post<ResponseBody<UserComment>>(`${baseUrl}/${pid}/comments${f.id ? '/' + f.id : ''}`, form, {
    enableUpload: true,
    name: 'add-project-comment',
    params
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Fetch all tracks
 *
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const loadTracksRequest = (params?: GenericData) => {
  const url = params?.release_id ? `releases/${params?.release_id}/tracks` : 'tracks'

  return alova.Get<ResponseBody<Track[]>>(url, {
    hitSource: 'create-track',
    params: Object.assign({}, {
      with: 'artist',
    }, params)
  })
}

/**
 * Fetch a single track
 *
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const loadTrackRequest = (id: string | string[], params?: GenericData) => {
  const url = params?.release_id ? `releases/${params?.release_id}/tracks` : 'tracks'

  return alova.Get(`${url}/${id}`, {
    transformData: (e: ResponseBody<Track>) => e.data,
    hitSource: 'create-track' + id,
    params: Object.assign({}, {
      with: 'artist',
    }, params)
  })
}

/**
 * Fetch all release (None-creator endpoint)
 *
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const loadReleasesRequest = (params?: GenericData) => {
  return alova.Get<ResponseBody<Release[]>>('releases', {
    hitSource: 'create-release',
    params: {
      with: 'artist,genre,release',
      ...params
    }
  })
}

/**
 * Fetch a single release (None-creator endpoint)
 *
 * @param id The ID of the release to fetch
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const loadReleaseRequest = (id: string | string[], params?: GenericData) => {
  return alova.Get(`releases/${id}`, {
    transformData: (e: ResponseBody<Release>) => e.data,
    hitSource: 'create-release' + (id || ''),
    params: {
      with: 'artist,genre,release',
      ...params
    }
  })
}

/**
 * Create/Update a release
 *
 * @param f The form data object
 * @returns
 */
export const createReleaseRequest = (f: Release) => {
  type Use = GenericData & { tracks: GenericData[] }
  const form: Use = Object.assign({ tracks: [] }, toRaw(f), {
    genre: undefined,
    artist: undefined,
  }) as unknown as Use

  // delete form.tracks
  if (form.tracks) {
    form.tracks = toRaw(form.tracks).map(e => {
      return Object.assign({}, e, {
        genre: undefined,
        artist: undefined,
        imageUrl: undefined,
        streamUrl: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      })
    })
  }

  const request = axios.Post<ResponseBody<Release>>(`creator/releases${form.id ? '/' + form.id : ''}`, {
    ...form,
    _method: form.id ? 'PUT' : 'POST'
  }, {
    enableUpload: true,
    name: 'create-release' + (f.slug || f.id || ''),
    params: {
      with: 'artist,genre,release,tracks,project'
    }
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Create/Update a track
 *
 * @param f The form data object
 * @returns
 */
export const saveTrackRequest = (f: Track) => {
  const form = Object.assign({}, f)
  if (form.release) {
    delete form.release.genre
    delete form.release.tracks
    delete form.release.artist
  }
  const request = axios.Post<ResponseBody<Track>>('creator/releases/generic/tracks/save', form, {
    enableUpload: true,
    name: 'create-track',
    params: {
      with: 'artist,genre,release'
    }
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Fetch all users/creators
 *
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadUsersRequest = (params?: GenericData) => {
  return alova.Get<ResponseBody<User[]>>('users', {
    hitSource: 'create-user',
    params
  })
}

/**
 * Fetch a single user/creator
 *
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadUserRequest = (id: string | string[], params?: GenericData) => {
  return alova.Get(`users/${id}`, {
    transformData: (e: ResponseBody<User>) => e.data,
    hitSource: 'create-user' + id,
    params
  })
}

/**
 * Fetch all artists
 *
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadArtistsRequest = (params?: GenericData) => {
  return alova.Get<ResponseBody<Artist[]>>('artists', {
    hitSource: 'create-user',
    params
  })
}

/**
 * Fetch an artist
 *
 * @param id The ID of the artist to fetch
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadArtistRequest = (id: string | string[], params?: GenericData, guest = false) => {
  const url = guest ? 'artists' : 'creator/artists'
  return alova.Get(`${url}/${id}`, {
    transformData: (e: ResponseBody<Artist>) => e.data,
    hitSource: 'create-user' + id,
    params
  })
}

/**
 * Create/Update an artist
 *
 * @param form The form data object
 * @returns
 */
export const createArtistRequest = (form: Artist) => {
  const request = axios.Post<ResponseBody<Artist>>(`creator/artists${form.id ? '/' + form.id : ''}`, {
    ...form,
    _method: form.id ? 'PUT' : 'POST'
  }, {
    enableUpload: true,
    name: 'create-user'
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Fetch a project
 *
 * @param id The ID of the project to fetch
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectRequest = (id: string | string[], params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'
  return alova.Get(`${url}/${id}`, {
    transformData: (e: ResponseBody<Project>) => e.data,
    hitSource: 'create-project' + id,
    params: {
      with: !guest ? 'tracks' : undefined,
      ...params
    }
  })
}

/**
 * Fetch all project
 *
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectsRequest = (params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'
  return alova.Get<ResponseBody<Project[]>>(url, {
    hitSource: 'create-project',
    params: {
      with: !guest ? 'tracks' : undefined,
      ...params
    }
  })
}

/**
 * Create/Update a project
 *
 * @param f The form data object
 * @returns
 */
export const createProjectRequest = (f: Project & UploadData) => {

  const form = {
    image: f.image,
    title: f.title,
    privacy: f.privacy,
    description: f.description,
    _method: f.id ? 'PUT' : 'POST',
  }

  const request = axios.Post<ResponseBody<Project>>(`creator/projects${f.id ? '/' + f.id : ''}`, form, {
    enableUpload: true,
    name: 'create-project' + (f.slug || f.id || ''),
    params: {
      with: 'tracks'
    }
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Fetch a track belonging to a project
 *
 * @param p The project object that owns the tracks
 * @param id ID of the track
 * @param _params  Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectTrackRequest = (p: Project, id: string, _params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'
  return alova.Get(`${url}/${p.id}/tracks/${id}`, {
    transformData: (e: ResponseBody<ProjectTrack>) => e.data,
    hitSource: 'create-project-track' + id,
    params: { with: !guest ? 'genre,artist' : undefined, ..._params }
  })
}

/**
 * Fetch all tracks belonging to a project
 *
 * @param p The project object that owns the tracks
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectTracksRequest = (p: Project, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/tracks`, {
    transformData: (e: ResponseBody<ProjectTrack[]>) => e.data,
    hitSource: 'create-project-track',
    params: { with: !guest ? 'genre,artist' : undefined, ...params }
  })
}

/**
 * Fetch all track stems belonging to a project track
 *
 * @param p The project object
 * @param t The track object that owns the stems
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectTrackStemsRequest = (p: Project, t: ProjectTrack, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/tracks/${t.id}/stems`, {
    transformData: (e: ResponseBody<WavePlaylistTrack[]>) => e.data,
    hitSource: 'create-project-track-stem',
    params
  })
}

/**
 * Save a track stem belonging to a project track
 *
 * @param f The form data object
 * @param p The project object
 * @param t The track object that owns the stems
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const saveProjectTrackStemRequest = (
  f: UploadData,
  p: Project,
  t: ProjectTrack,
  params?: GenericData
) => {
  const url = `creator/projects/${p.id}/tracks/${t.id}/stems${f.id ? '/' + f.id : ''}`

  const request = axios.Post<ResponseBody<WavePlaylistTrack>>(url, {
    src: f.src instanceof File ? f.src : undefined,
    meta: f.meta || f,
    title: f.title,
    stem_id: f.stem_id,
    _method: f.id ? 'PUT' : 'POST',
  }, {
    enableUpload: true,
    name: 'create-project-track-stem',
    params: params
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Delete a track stem belonging to a project track
 *
 * @param id The ID of the track stem to delete
 * @param p The project object
 * @param t The track object that owns the stems
 * @param params Optional parameters to pass to the request
 * @returns
 */
export const deleteProjectTrackStemRequest = (id: string, p: Project, t: ProjectTrack, params?: GenericData) => {
  return alova.Delete<ResponseBody<WavePlaylistTrack>>(`creator/projects/${p.id}/tracks/${t.id}/stems/${id}`, {}, {
    name: 'delete-project-track-stem',
    params: params
  })
}

/**
 * Fetch all assets for a project track
 *
 * @param t The track object that owns the stems
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectTrackAssetsRequest = (t: ProjectTrack, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${t.project_id}/tracks/${t.id}/assets`, {
    transformData: (e: ResponseBody<FileAsset[]>) => e.data,
    hitSource: 'create-project-track-asset',
    params
  })
}

/**
 * Create/Update an asset for a project track
 *
 * @param f The form data object
 * @param t The project track object that owns the asset
 * @returns
 */
export const saveProjectTrackAssetRequest = (f: UploadData, t: ProjectTrack) => {
  const request = axios.Post<ResponseBody<FileAsset>>(`creator/projects/${t.project_id}/tracks/${t.id}/assets`, {
    title: f.title,
    meta: f.meta,
    description: f.description,
    file: f.file instanceof File ? f.file : undefined,
    _method: f.id ? 'PUT' : 'POST',
  }, {
    enableUpload: true,
    name: 'create-project-track-asset',
    params: {
      with: 'ext'
    }
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Create/Update a project track
 *
 * @param f The form data object
 * @param p The project object
 * @returns
 */
export const saveProjectTrackRequest = (f: ProjectTrack, p: Project) => {

  const request = axios.Post<ResponseBody<ProjectTrack>>(`creator/projects/${p.id}/tracks${f.id ? '/' + f.id : ''}`, {
    title: f.title,
    stems: f.stems,
    preview: typeof f.preview !== 'string' ? f.preview : undefined,
    privacy: f.privacy,
    genre_id: f.genre_id,
    artist_id: f.artist_id,
    description: f.description,
    _method: f.id ? 'PUT' : 'POST',
  }, {
    enableUpload: true,
    name: 'create-project-track',
    params: {
      with: 'artist,genre'
    }
  })

  request.config.headers['Content-Type'] = 'multipart/form-data'

  return request
}

/**
 * Fetch all the collaboratores for a project
 *
 * @param p The project object
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const loadProjectCollaboratorsRequest = (p: Project, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/collaborators`, {
    transformData: (e: ResponseBody<Collaber[]>) => e.data as Collaber[],
    hitSource: 'create-project-collaborator',
    params
  })
}

/**
 * Create/Update a project collaborator
 *
 * @param f The form data object
 * @param p The project object
 * @param params Optional parameters to pass to the request
 * @param guest If it should be loaded for non-creator
 * @returns
 */
export const saveProjectCollaboratorRequest = (f: Collaber, p: Project, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  const form = {
    role: f.role,
    custom: f.custom,
    user_id: String(f.user_id),
    _method: f.id ? 'PUT' : 'POST',
  }

  return alova.Post<ResponseBody<Collaber>>(`${url}/${p.id}/collaborators${f.id ? '/' + f.id : ''}`, form, {
    name: 'create-project-collaborator',
    params
  })
}
