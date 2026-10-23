import { createRealtime, type RealtimeClient, type RealtimeConfig } from '@arkstack/realtime';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { apiUrl } from 'src/utils/env';
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';

/**
 * This tab's id. It goes out with every API request, comes back on the
 * events those requests cause, and lets the tab skip its own changes.
 */
export const realtimeOrigin =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Who caused an event, and from which tab. Sent with every event. */
export type RealtimeMeta = {
  origin?: string | null;
  by?: { id: number | string; name?: string | null } | null;
};

/**
 * Loads the SDK a transport needs. Spelled out so the bundler can find each
 * one; they load only when that transport is used.
 */
const importModule = (specifier: string): Promise<unknown> => {
  switch (specifier) {
    case 'pusher-js':
      return import('pusher-js');
    case 'firebase/app':
      return import('firebase/app');
    case 'firebase/auth':
      return import('firebase/auth');
    case 'firebase/database':
      return import('firebase/database');
    default:
      return Promise.reject(new Error(`Realtime: ${specifier} is not available.`));
  }
};

let client: RealtimeClient | null = null;
let clientKey = '';

/**
 * The realtime client for the signed-in user, or null when realtime is off,
 * nobody is signed in, or this is the server render. It's rebuilt when the
 * user or the admin's realtime settings change.
 */
export const getRealtime = (): RealtimeClient | null => {
  if (typeof window === 'undefined') return null;

  const boot = useBootstrapStore();
  const settings = boot.realtime;
  const token = boot.token;

  if (!settings || settings.driver === 'none' || !settings.transport || !token) {
    if (client) void client.disconnect();
    client = null;
    clientKey = '';
    return null;
  }

  const key = JSON.stringify([settings, token]);
  if (client && key === clientKey) return client;

  if (client) void client.disconnect();

  const authEndpoint = apiUrl + (settings.authPath || 'realtime/auth');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const config: RealtimeConfig = { transport: settings.transport, importModule };

  if (settings.transport === 'pusher' && settings.pusher) {
    config.pusher = { ...settings.pusher, authEndpoint, auth: { headers } };
  } else if (settings.transport === 'firebase-database' && settings['firebase-database']) {
    config['firebase-database'] = { ...settings['firebase-database'], authEndpoint, auth: { headers } };
  } else {
    return null;
  }

  client = createRealtime(config);
  clientKey = key;

  return client;
};

/**
 * Listen to events on a private channel while the calling component is
 * alive. Events this tab caused are skipped. Pass the channel's name without
 * the `private-` prefix, or null to listen to nothing; when it changes, the
 * old channel is left and the new one joined.
 */
export const useRealtimeChannel = <Handlers extends Record<string, (payload: never) => void>>(
  channel: MaybeRefOrGetter<string | null | undefined>,
  handlers: Handlers,
) => {
  let stops: Array<() => void> = [];
  let generation = 0;

  const leave = () => {
    generation++;
    stops.forEach((stop) => stop());
    stops = [];
  };

  const join = async (name: string | null | undefined) => {
    leave();
    const rt = getRealtime();
    if (!name || !rt) return;

    const current = generation;
    const full = `private-${name}`;

    for (const [event, handler] of Object.entries(handlers)) {
      try {
        const stop = await rt.listen<RealtimeMeta>(full, event, (payload) => {
          if (payload?.origin && payload.origin === realtimeOrigin) return;
          (handler as (p: unknown) => void)(payload);
        });

        // Left (or moved to another channel) while this was connecting.
        if (current !== generation) stop();
        else stops.push(stop);
      } catch (e) {
        console.warn(`Realtime: could not listen to ${event} on ${full}`, e);
      }
    }
  };

  const boot = useBootstrapStore();

  watch(
    () => [toValue(channel), boot.token, boot.realtime] as const,
    ([name]) => void join(name),
    { immediate: true, deep: true },
  );

  onScopeDispose(leave);

  return { leave };
};
