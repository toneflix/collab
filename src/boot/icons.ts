import { defineBoot } from '#q-app';
import { IconSet } from 'quasar';
import IconBtn from 'src/components/Buttons/IconBtn.vue';
import { LucideQuasarIcons } from 'src/icons/LucideQuasarIcons';

declare module 'vue' {
  interface GlobalComponents {
    IconBtn: typeof IconBtn;
  }
}

export default defineBoot(({ app, ssrContext }) => {
  app.config.globalProperties.$q.iconMapFn = LucideQuasarIcons.mapFn;
  IconSet.set(LucideQuasarIcons.iconSet(), ssrContext);
  app.component('IconBtn', IconBtn);
});
