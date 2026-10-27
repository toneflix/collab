import AppLogo from 'src/components/Brand/AppLogo.vue';
import IconBtn from 'src/components/Buttons/IconBtn.vue';
import { IconSet } from 'quasar';
import { LucideQuasarIcons } from 'src/icons/LucideQuasarIcons';
import { defineBoot } from '#q-app';

declare module 'vue' {
  interface GlobalComponents {
    IconBtn: typeof IconBtn;
    AppLogo: typeof AppLogo;
  }
}

export default defineBoot(({ app, ssrContext }) => {
  app.config.globalProperties.$q.iconMapFn = LucideQuasarIcons.mapFn;
  IconSet.set(LucideQuasarIcons.iconSet(), ssrContext);
  app.component('IconBtn', IconBtn);
  app.component('AppLogo', AppLogo);
});
