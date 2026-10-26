import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type ConfigurationValue = string | number | boolean | null;

export type ConfigurationField = {
  title: string;
  type: 'text' | 'email' | 'url' | 'string' | 'number' | 'boolean';
  hint: string;
  value: ConfigurationValue;
  options?: string[];
};

export type ConfigurationSettings = {
  fields: Record<string, ConfigurationField>;
};

export const loadConfigurationRequest = () =>
  alova.Get('admin/configuration', {
    transform: (e: ResponseBody<ConfigurationSettings>) => e.data,
    cacheFor: 0,
  });

export const saveConfigurationRequest = (form: Record<string, ConfigurationValue>) =>
  alova.Put<ResponseBody<ConfigurationSettings>>('admin/configuration', form);
