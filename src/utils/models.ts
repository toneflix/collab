import { RouteLocationRaw } from 'vue-router';

export type PageData = {
  cache: Record<string, string>;
};

export type Initialize = {
  settings: Record<string, string>;
};

export interface Category {
  id: string | number,
  slug: string;
  title: string;
};

export type CollabEvents = {
  togglePlay: (state: boolean, track: Track, album?: Album, origin?: string | 'player') => void;
  seeking: (position: number, track?: Track, file_url?: string) => void;
}

export interface SeekingData {
  position: number,
  track?: Track;
  url?: string;
};

export interface Genre {
  id: number,
  slug: string;
  title: string;
  imageUrl: string;
};

export interface Artist {
  id: string | number,
  name: string;
  about: string;
  verified: boolean;
  username: string,
  imageUrl: string;
  followers: number,
  following: number,
  youFollow: boolean;
  followsYou: boolean;
  reputation: number,
  projects_count: number,
};

export interface Track {
  id: string | number,
  slug: string,
  title: string;
  loved: boolean;
  artist?: Artist;
  streams: number;
  imageUrl: string;
  duration: number;
  streamUrl: string;
  description: string;
};

export type Album = {
  id: string | number,
  slug: string,
  title: string;
  loved: boolean;
  artist?: Artist;
  streams: number;
  imageUrl: string;
  duration: number;
  description: string;
  tracks_count: number;
};

export type Project = {
  id: string | number,
  slug: string,
  title: string;
  props: number;
  group: string;
  proped: boolean;
  imageUrl: string;
  description: string,
  collaborator_count: number;
};

export type NavigationLink = {
  to?: RouteLocationRaw,
  icon: string,
  title: string,
  group?: string,
  separator?: boolean,
  button?: {
    icon: string,
    action: RouteLocationRaw | ((param: string | number | Record<string, string>) => void)
  }
};

export type UserComment = {
  id: string | number,
  text: string,
  user: Artist,
  replies: {
    id: string | number,
    text: string,
    user: Artist,
    createdAt: Date | string,
  }[],
  expanded: boolean,
  createdAt: Date | string,
  replies_count: number,
}
