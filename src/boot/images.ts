import { QImg } from 'quasar';
import { defineBoot } from '#q-app';
import { avatarFallback, imageFallback, installImageFallback } from 'src/utils/imageFallback';

// Give every q-img a placeholder to show when its image can't load:
// a person for avatars (their URLs mention "avatar"), artwork for everything else.
(QImg.props as Record<string, unknown>).errorSrc = {
  type: String,
  default: (props: { src?: string }) =>
    /avatar/i.test(props.src || '') ? avatarFallback : imageFallback,
};

export default defineBoot(() => {
  if (!import.meta.env.SSR) {
    installImageFallback();
  }
});
