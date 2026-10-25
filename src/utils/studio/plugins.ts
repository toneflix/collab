import type { WamLibraryEntry } from '@dawcore/wam';

/** The Web Audio Modules community registry. */
const REGISTRY = 'https://www.webaudiomodules.com/community/plugins.json';
const REGISTRY_BASE = 'https://www.webaudiomodules.com/community/plugins/';

let library: Promise<WamLibraryEntry[]> | null = null;

/** Effect plugins from the community registry, loaded once. Empty when it can't be reached. */
export const loadPluginLibrary = () => {
  library ??= import('@dawcore/wam')
    .then(({ fetchWamLibrary }) => fetchWamLibrary(REGISTRY, { baseUrl: REGISTRY_BASE }))
    .then(({ entries }) => entries.filter((e) => !e.category?.some((c: string) => /instrument|midi/i.test(c))))
    .catch(() => {
      library = null;
      return [];
    });

  return library;
};
