<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMeta } from 'quasar';
import { frontUrl } from 'src/utils/env';
import { trackInputModality } from 'src/utils/input-modality';

defineOptions({
  name: 'App',
});

const router = useRouter();

const shareImage = `${frontUrl}/share-image-1200.jpg`;

/** Default share image; pages with their own artwork replace `ogImage` and `twitterImage`. */
useMeta({
  meta: {
    ogImage: { property: 'og:image', content: shareImage },
    twitterImage: { name: 'twitter:image', content: shareImage },
    twitterCard: { name: 'twitter:card', content: 'summary_large_image' },
  },
});

/** Fades out the launch splash from index.html, once the first page has painted. */
const hideSplash = () => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('app-splash--hidden');
  setTimeout(() => splash.remove(), 400);
};

onMounted(() => {
  trackInputModality();
  void router.isReady().then(() => requestAnimationFrame(() => requestAnimationFrame(hideSplash)));
});
</script>
