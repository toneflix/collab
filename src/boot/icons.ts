import { defineBoot } from '#q-app';
import { IconSet } from 'quasar';
import { LucideQuasarIcons } from 'src/icons/LucideQuasarIcons';

export default defineBoot(({ app, ssrContext }) => {
  app.config.globalProperties.$q.iconMapFn = LucideQuasarIcons.mapFn;
  IconSet.set(LucideQuasarIcons.iconSet(), ssrContext);
});
