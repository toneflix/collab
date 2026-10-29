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

/** Default share image; pages with their own artwork replace `ogImage`, which X also reads. */
useMeta({
  meta: {
    ogImage: { property: 'og:image', content: `${frontUrl}/share-image.jpg` },
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
