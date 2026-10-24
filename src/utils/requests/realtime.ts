import { alova } from 'src/boot/alova'
import { EnvKey, RealtimeSettings, ResponseBody } from '../models'

export type RealtimeDriver = RealtimeSettings['driver']

export type RealtimeAdminSettings = {
  driver: RealtimeDriver;
  drivers: RealtimeDriver[];
  /** Each driver's .env keys */
  keys: Partial<Record<RealtimeDriver, EnvKey[]>>;
  /** .env keys the chosen driver still needs */
  missing: string[];
  /** What browsers get to connect */
  client: RealtimeSettings;
}

/**
 * The realtime driver and whether its keys are set (needs the manage-configuration permission).
 */
export const loadRealtimeSettingsRequest = () => {
  return alova.Get('admin/realtime', {
    transform: (e: ResponseBody<RealtimeAdminSettings>) => e.data,
    cacheFor: 0,
  })
}

/**
 * Save the realtime driver.
 */
export const saveRealtimeSettingsRequest = (form: { realtime_driver: RealtimeDriver }) => {
  return alova.Put<ResponseBody<RealtimeAdminSettings>>('admin/realtime', form)
}

/**
 * Send a test event to the signed-in admin's own channel.
 */
export const testRealtimeRequest = () => {
  return alova.Post<ResponseBody<{ channel: string; event: string }>>('admin/realtime/test', {})
}
