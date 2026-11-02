import type { RackSnapshot, SavedPlugin, WamConstructor, WebAudioModule } from '@toneflix/studio';
import { EFFECT_NODES } from './effect-nodes';
import { allEffects, effectInfo, faustState, isFaust, isPlugin, pluginName, type EffectInfo, type StemEffect } from './effects';

/** The plugin rack URL of one of our own effects, built-in or Faust. */
const EFFECT_URL = 'toneflix:effect/';

export const effectUrl = (type: string) => `${EFFECT_URL}${type}`;

const typeOf = (url: string) => (url.startsWith(EFFECT_URL) ? url.slice(EFFECT_URL.length) : null);

/** Sent from an effect's own controls each time a setting changes. */
export const EFFECT_CHANGE = 'tf-effect-change';

type Params = Record<string, number>;

/** The node parts of a WAM the rack and mixer use. */
type HostedNode = WebAudioModule['audioNode'];

/**
 * Give a two-ended effect one node to stand for it: sound goes into `inlet`,
 * and anything connected from it is connected from `output`.
 */
const bridge = (inlet: GainNode, output: AudioNode) => {
  const node = inlet as GainNode & Record<string, unknown>;
  node.connect = ((...args: Parameters<AudioNode['connect']>) => (output.connect as (...a: unknown[]) => unknown)(...args)) as AudioNode['connect'];
  node.disconnect = ((...args: unknown[]) => (output.disconnect as (...a: unknown[]) => unknown)(...args)) as AudioNode['disconnect'];

  return node;
};

/** A WAM-shaped stand-in, with the parts the rack and mixer call. */
const hosted = (
  context: BaseAudioContext,
  node: AudioNode,
  info: { name: string; id: string },
  state: { get: () => unknown; set: (value: unknown) => void | Promise<void>; destroy?: () => void },
  gui: () => Element,
): WebAudioModule => {
  const audioNode = Object.assign(node, {
    getState: async () => state.get(),
    setState: async (value: unknown) => void (await state.set(value)),
    getParameterInfo: async () => ({}),
    getParameterValues: async () => ({}),
    setParameterValues: async () => undefined,
    scheduleEvents: () => undefined,
    clearEvents: () => undefined,
    destroy: () => state.destroy?.(),
  }) as unknown as HostedNode;

  return {
    isWebAudioModule: true,
    audioContext: context,
    audioNode,
    descriptor: { identifier: info.id, name: info.name, vendor: 'Toneflix' },
    moduleId: info.id,
    instanceId: `${info.id}-${Math.random().toString(36).slice(2)}`,
    name: info.name,
    vendor: 'Toneflix',
    createGui: async () => gui(),
    destroyGui: (element: Element) => element.remove(),
  };
};

const cleanParams = (info: EffectInfo, value: unknown): Params => {
  const given = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const out: Params = { ...info.defaults };
  for (const p of info.params) {
    const n = Number(given[p.key]);
    if (Number.isFinite(n)) out[p.key] = Math.min(p.max, Math.max(p.min, n));
  }

  return out;
};

const format = (value: number, step: number, unit?: string) => {
  const digits = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`;
};

/** Sliders for an effect's settings, as its editor in the mixer's plugin window. */
const paramsGui = (info: EffectInfo, read: () => Params, write: (params: Params) => void) => {
  const root = document.createElement('div');
  root.className = 'tf-effect-gui';
  const about = document.createElement('p');
  about.className = 'tf-effect-gui__about';
  about.textContent = info.description;
  root.append(about);

  for (const p of info.params) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const input = document.createElement('input');
    const value = document.createElement('output');

    row.className = 'tf-effect-gui__row';
    name.textContent = p.label;
    input.type = 'range';
    input.min = String(p.min);
    input.max = String(p.max);
    input.step = String(p.step);
    input.value = String(read()[p.key] ?? info.defaults[p.key] ?? p.min);
    value.textContent = format(Number(input.value), p.step, p.unit);

    input.addEventListener('input', () => {
      value.textContent = format(Number(input.value), p.step, p.unit);
      write({ ...read(), [p.key]: Number(input.value) });
    });
    input.addEventListener('change', () => root.dispatchEvent(new CustomEvent(EFFECT_CHANGE, { bubbles: true })));
    input.addEventListener('dblclick', () => {
      input.value = String(info.defaults[p.key] ?? p.min);
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    });
    row.append(name, input, value);
    root.append(row);
  }

  return root;
};

const compiled = new Map<string, Promise<WamConstructor>>();

/** A Faust effect's WAM, compiled in the browser once per source. */
const compileFaust = (info: EffectInfo) => {
  const { name, source } = info.faust!;
  const key = `${name}\n${source}`;
  let factory = compiled.get(key);
  if (!factory) {
    factory = import('@dawcore/faust').then(async ({ compileFaustToWam }) => (await compileFaustToWam(source, { name })).factory as unknown as WamConstructor);
    compiled.set(key, factory);
    factory.catch(() => compiled.delete(key));
  }

  return factory;
};

/** One of our own effects as a plugin the rack can host. Its state is its settings. */
const ownEffect = (type: string): WamConstructor => ({
  createInstance: async (groupId, context, initial) => {
    const info = effectInfo(type);
    if (!info) throw new Error(`Unknown effect ${type}`);

    let params = cleanParams(info, initial);

    if (isFaust(type)) {
      const plugin = await (await compileFaust(info)).createInstance(groupId, context);
      const node = plugin.audioNode;
      const set = node.setState.bind(node);
      const destroy = node.destroy?.bind(node);
      await set(faustState(info, params));

      return hosted(
        context,
        node,
        { name: info.label, id: type },
        {
          get: () => ({ ...params }),
          set: async (value) => {
            params = cleanParams(info, value);
            await set(faustState(info, params));
          },
          destroy,
        },
        () => paramsGui(info, () => params, (next) => {
          params = cleanParams(info, next);
          void set(faustState(info, params));
        }),
      );
    }

    const create = EFFECT_NODES[type];
    if (!create) throw new Error(`Unknown effect ${type}`);

    const effect = create(context);
    const inlet = context.createGain();
    inlet.connect(effect.input);
    effect.applyParams(params);

    return hosted(
      context,
      bridge(inlet, effect.output),
      { name: info.label, id: type },
      {
        get: () => ({ ...params }),
        set: (value) => {
          params = cleanParams(info, value);
          effect.applyParams(params);
        },
        destroy: () => {
          (GainNode.prototype.disconnect as () => void).call(inlet);
          effect.dispose?.();
        },
      },
      () => paramsGui(info, () => params, (next) => {
        params = cleanParams(info, next);
        effect.applyParams(params);
      }),
    );
  },
});

/**
 * A plugin that can't run here (turned off, or it failed to load). It passes
 * sound through untouched and keeps its settings, so saving loses nothing.
 */
const heldPlugin = (url: string, reason: string): WamConstructor => ({
  createInstance: async (_groupId, context, initial) => {
    let state = initial;
    const name = pluginName({ type: 'wam', url, params: {} });

    return hosted(
      context,
      context.createGain(),
      { name: `${name} (off)`, id: url },
      { get: () => state, set: (value) => void (state = value) },
      () => {
        const note = document.createElement('p');
        note.className = 'tf-effect-gui__about';
        note.textContent = reason;
        return note;
      },
    );
  },
});

/**
 * Loads the rack's plugins: our own effects by their `toneflix:effect/` URL,
 * and Web Audio Modules from their own URL when `plugins` allows them.
 */
export const rackLoader =
  (plugins: () => boolean) =>
  async (url: string): Promise<WamConstructor> => {
    const type = typeOf(url);
    if (type) return ownEffect(type);
    if (!plugins()) return heldPlugin(url, 'Plugins are turned off on this site, so this one is skipped. Its settings are kept.');

    try {
      const module = await import(/* @vite-ignore */ url);
      return (module.default ?? module) as WamConstructor;
    } catch (error) {
      console.warn('[studio] plugin failed to load', url, error);
      return heldPlugin(url, "This plugin couldn't load, so it's skipped. Its settings are kept.");
    }
  };

/** A saved chain as the rack keeps it. */
export const effectsToRack = (list: StemEffect[]): SavedPlugin[] =>
  list
    .filter((e) => (isPlugin(e) ? !!e.url : !!effectInfo(e.type)))
    .map((e) => (isPlugin(e) ? { url: e.url!, bypass: !!e.bypassed, state: e.state } : { url: effectUrl(e.type), bypass: !!e.bypassed, state: { ...e.params } }));

/** A rack chain as saved in a stem's `meta.effects`. */
export const rackToEffects = (list: SavedPlugin[], names: (url: string) => string | undefined = () => undefined): StemEffect[] =>
  list.map((saved) => {
    const type = typeOf(saved.url);
    if (type) {
      return { type: type as StemEffect['type'], params: { ...(saved.state as Params) }, ...(saved.bypass ? { bypassed: true } : {}) };
    }

    const name = names(saved.url);
    return {
      type: 'wam' as const,
      params: {},
      url: saved.url,
      ...(name ? { name } : {}),
      ...(saved.state !== undefined ? { state: saved.state } : {}),
      ...(saved.bypass ? { bypassed: true } : {}),
    };
  });

/** Our own effects for the mixer's add menu, Faust ones included. */
export const effectCatalog = () => allEffects().map((e) => ({ name: e.label, url: effectUrl(e.type) }));

export type { RackSnapshot };
