import { Artist, Collaber, ExploreData, FileAsset, GenericData, Project, ProjectTrack, Release, ResponseBody, Track, UploadData } from './models'
import { alova, axios } from 'src/boot/alova'

import { WavePlaylistTrack } from './playlist'
import { toRaw } from 'vue'

// Explore
export const exploreRequest = (params?: GenericData) => {
  return alova.Get('explore', {
    transformData: (e: ResponseBody<ExploreData>) => e.data,
    hitSource: 'play-track',
    params
  })
}

// Releases
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

export const loadReleaseRequest = (id?: string, params?: GenericData) => {
  return alova.Get(`releases${id ? '/' + id : ''}`, {
    transformData: (e: ResponseBody<Release>) => e.data,
    hitSource: 'create-release' + (id || ''),
    params: {
      with: 'artist,genre,release',
      ...params
    }
  })
}

// Release Tracks

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

// Artists

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

// Projects
export const loadProjectRequest = (id?: string, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'
  return alova.Get(url + (id ? '/' + id : ''), {
    transformData: (e: ResponseBody<Project>) => e.data,
    hitSource: 'create-project' + (id || ''),
    params: {
      with: !guest ? 'tracks' : undefined,
      ...params
    }
  })
}

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

// Project Tracks

// Load Single Track
export const loadProjectTrackRequest = (p: Project, id: string, _params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'
  return alova.Get(`${url}/${p.id}/tracks/${id}`, {
    transformData: (e: ResponseBody<ProjectTrack>) => e.data,
    hitSource: 'create-project-track' + id,
    params: { with: !guest ? 'genre,artist' : undefined, ..._params }
  })
}

// Load Track List
export const loadProjectTracksRequest = (p: Project, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/tracks`, {
    transformData: (e: ResponseBody<ProjectTrack[]>) => e.data,
    hitSource: 'create-project-track',
    params: { with: !guest ? 'genre,artist' : undefined, ...params }
  })
}

// Load Track Stems
export const loadProjectTrackStemsRequest = (p: Project, t: ProjectTrack, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/tracks/${t.id}/stems`, {
    transformData: (e: ResponseBody<WavePlaylistTrack[]>) => e.data,
    hitSource: 'create-project-track-stem',
    params
  })
}

// Save Track Stems
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

// Delete Track Stems
export const deleteProjectTrackStemRequest = (id: string, p: Project, t: ProjectTrack, params?: GenericData) => {
  return alova.Delete<ResponseBody<WavePlaylistTrack>>(`creator/projects/${p.id}/tracks/${t.id}/stems/${id}`, {}, {
    name: 'delete-project-track-stem',
    params: params
  })
}

// Load Track Assets
export const loadProjectTrackAssetsRequest = (t: ProjectTrack, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${t.project_id}/tracks/${t.id}/assets`, {
    transformData: (e: ResponseBody<FileAsset[]>) => e.data,
    hitSource: 'create-project-track-asset',
    params
  })
}

// Save Track Asset
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

// Save Project
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

// Project Collaborators

// Load Collaborators List
export const loadProjectCollaboratorsRequest = (p: Project, params?: GenericData, guest = false) => {
  const url = guest ? 'projects' : 'creator/projects'

  return alova.Get(`${url}/${p.id}/collaborators`, {
    transformData: (e: ResponseBody<Collaber[]>) => e.data as Collaber[],
    hitSource: 'create-project-collaborator',
    params
  })
}

// Save Collaborator
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
