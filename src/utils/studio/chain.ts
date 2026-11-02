import type { Effect } from '@toneflix/studio';
import { EFFECT_NODES, type EffectInstance } from './effect-nodes';
import { effectInfo, faustState, isFaust, isPlugin, pluginName, type StemEffect } from './effects';

/** The parts of a Web Audio Module plugin the studio uses. */
export interface WamPlugin {
  audioNode: AudioNode & {
    getState(): Promise<unknown>;
    setState(state: unknown): Promise<void>;
    setParameterValues?(values: Record<string, { id: string; value: number; normalized: boolean }>): Promise<void>;
    destroy?(): void;
  };
  descriptor?: { name?: string };
  name?: string;
  createGui?(): Promise<Element>;
  destroyGui?(gui: Element): void;
}

interface WamFactory {
  createInstance(groupId: string, context: BaseAudioContext, state?: unknown): Promise<WamPlugin>;
}

/** One effect of a chain, running. */
export interface LiveEffect {
  /** Its place in the saved chain */
  index: number;
  effect: StemEffect;
  node: EffectInstance;
  /** Set for plugins and Faust effects */
  plugin?: WamPlugin;
}

export interface BuiltChain {
  live: LiveEffect[];
  /** False when Faust effects or plugins were left out because they can't load yet */
  complete: boolean;
  /** Plugins that failed to load */
  errors: { effect: StemEffect; error: unknown }[];
}

export interface ChainOptions {
  /** Web Audio Module plugins are allowed */
  plugins: boolean;
  /** Faust effects and plugins can load now (their context is running, Faust list loaded) */
  canLoad: boolean;
}

const modules = new Map<string, Promise<WamFactory>>();
const compiled = new Map<string, Promise<WamFactory>>();

const loadModule = (url: string) => {
  let module = modules.get(url);
  if (!module) {
    module = import(/* @vite-ignore */ url).then((m: { default?: WamFactory }) => (m.default ?? m) as WamFactory);
    modules.set(url, module);
    module.catch(() => modules.delete(url));
  }

  return module;
};

const compileFaust = (name: string, source: string) => {
  const key = `${name}\n${source}`;
  let factory = compiled.get(key);
  if (!factory) {
    factory = import('@dawcore/faust').then(async ({ compileFaustToWam }) => (await compileFaustToWam(source, { name })).factory as unknown as WamFactory);
    compiled.set(key, factory);
    factory.catch(() => compiled.delete(key));
  }

  return factory;
};

const groups = new WeakMap<BaseAudioContext, Promise<string>>();

/** The WAM host group of a context, set up once. */
const hostGroup = (context: BaseAudioContext) => {
  let group = groups.get(context);
  if (!group) {
    group = import('@toneflix/studio').then(async ({ initializeWamHost }) => (await initializeWamHost(context))[0]);
    groups.set(context, group);
  }

  return group;
};

const parameterMap = (values: Record<string, number>) =>
  Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { id, value, normalized: false }]));

/** A plugin as a chain node; `toState` turns the effect's params into the plugin's own settings. */
const pluginNode = (plugin: WamPlugin, toState: (params: Record<string, number>) => Record<string, number>): EffectInstance => ({
  input: plugin.audioNode,
  output: plugin.audioNode,
  applyParams: (params) => void plugin.audioNode.setParameterValues?.(parameterMap(toState(params)))?.catch(() => undefined),
  dispose: () => {
    plugin.audioNode.disconnect();
    plugin.audioNode.destroy?.();
  },
});

/** Make one effect in a context, or null when it can't run there now. */
export const buildEffect = async (context: BaseAudioContext, effect: StemEffect, index: number, options: ChainOptions): Promise<LiveEffect | null> => {
  if (isPlugin(effect)) {
    if (!options.plugins || !options.canLoad || !effect.url) return null;

    const factory = await loadModule(effect.url);
    const plugin = await factory.createInstance(await hostGroup(context), context, effect.state);
    if (effect.state !== undefined) await plugin.audioNode.setState(effect.state);

    return { index, effect, plugin, node: pluginNode(plugin, () => ({})) };
  }

  if (isFaust(effect.type)) {
    const info = effectInfo(effect.type);
    if (!info?.faust || !options.canLoad) return null;

    const factory = await compileFaust(info.faust.name, info.faust.source);
    const plugin = await factory.createInstance(await hostGroup(context), context);
    await plugin.audioNode.setState(faustState(info, effect.params));

    return { index, effect, plugin, node: pluginNode(plugin, (params) => faustState(info, params)) };
  }

  const create = EFFECT_NODES[effect.type];
  if (!create) return null;

  const node = create(context);
  node.applyParams({ ...effectInfo(effect.type)?.defaults, ...effect.params });

  return { index, effect, node };
};

/** Make a chain's effects in a context. Bypassed effects are left out. */
export const buildChain = async (context: BaseAudioContext, list: StemEffect[], options: ChainOptions): Promise<BuiltChain> => {
  const errors: BuiltChain['errors'] = [];
  let complete = true;

  const made = await Promise.all(
    list.map(async (effect, index) => {
      if (effect.bypassed) return null;
      try {
        const live = await buildEffect(context, effect, index, options);
        if (!live && (isFaust(effect.type) || (isPlugin(effect) && options.plugins))) complete = false;

        return live;
      } catch (error) {
        console.warn(`[stem editor] ${pluginName(effect)}`, error);
        errors.push({ effect, error });

        return null;
      }
    }),
  );

  return { live: made.filter((m): m is LiveEffect => !!m), complete, errors };
};

/** The chain's nodes, as a mixer channel takes them. */
export const chainNodes = (chain: BuiltChain): Effect[] => chain.live.map(({ node }) => ({ input: node.input, output: node.output }));

/** Free a chain's effects. */
export const disposeChain = (chain: BuiltChain | undefined) => chain?.live.forEach(({ node }) => node.dispose?.());
