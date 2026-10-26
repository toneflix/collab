import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type AuthPagesLayout = { key: string; title: string; form: number; banner: number };

export type AuthPagesField = { key: string; label: string; default: string; value: string | null };

export type AuthPagesSettings = {
  layout: string;
  layouts: AuthPagesLayout[];
  banner: string | null;
  pages: { key: string; title: string; fields: AuthPagesField[] }[];
};

export const loadAuthPagesRequest = () =>
  alova.Get('admin/auth-pages', {
    transform: (e: ResponseBody<AuthPagesSettings>) => e.data,
    cacheFor: 0,
  });

export const saveAuthPagesRequest = (body: { layout: string; texts: Record<string, string | null> }) =>
  alova.Put<ResponseBody<AuthPagesSettings>>('admin/auth-pages', body);

export const uploadAuthBannerRequest = (file: File) => {
  const body = new FormData();

  body.append('banner', file);

  return alova.Post<ResponseBody<AuthPagesSettings>>('admin/auth-pages/banner', body);
};

export const removeAuthBannerRequest = () =>
  alova.Delete<ResponseBody<AuthPagesSettings>>('admin/auth-pages/banner');
