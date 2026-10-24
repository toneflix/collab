import { alova } from 'src/boot/alova'
import { RealtimeSettings, ResponseBody } from '../models'

export type RealtimeDriver = RealtimeSettings['driver']

export type RealtimeField = {
  title: string;
  secret: boolean;
  hint: string;
  /** Always null for secrets, which are never sent back */
  value: string | null;
  isSet: boolean;
}

export type RealtimeAdminSettings = {
  driver: RealtimeDriver;
  drivers: RealtimeDriver[];
  fields: Record<string, RealtimeField>;
  /** Settings the chosen driver still needs */
  missing: string[];
  /** What browsers get to connect */
  client: RealtimeSettings;
}

/**
 * The realtime driver and its settings (needs the manage-configuration permission).
 */
export const loadRealtimeSettingsRequest = () => {
  return alova.Get('admin/realtime', {
    transform: (e: ResponseBody<RealtimeAdminSettings>) => e.data,
    cacheFor: 0,
  })
}

/**
 * Save the realtime driver and settings. Empty secrets keep their saved value.
 */
export const saveRealtimeSettingsRequest = (form: Record<string, string | number | null>) => {
  return alova.Put<ResponseBody<RealtimeAdminSettings>>('admin/realtime', form)
}

/**
 * Send a test event to the signed-in admin's own channel.
 */
export const testRealtimeRequest = () => {
  return alova.Post<ResponseBody<{ channel: string; event: string }>>('admin/realtime/test', {})
}
