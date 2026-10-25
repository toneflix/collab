<template>
  <div class="flex flex-col items-center gap-4 px-4 py-12 text-center">
    <div class="release-art !flex-none">
      <q-img
        no-spinner
        :ratio="1"
        :src="release.imageUrl"
        :error-src="placeholder"
        class="rounded-xl"
      />
      <q-icon name="fas fa-circle-check" size="44px" color="positive" class="release-art__badge" />
    </div>

    <div class="!flex-none">
      <div class="text-3xl font-bold">Your release is live</div>
      <div class="mt-2 text-lg text-grey-5">
        {{ release.title }}<template v-if="release.version"> · {{ release.version }}</template>
        is out for everyone to hear.
      </div>
    </div>

    <div class="flex flex-wrap justify-center gap-2 mt-2 !flex-none">
      <q-btn
        no-caps
        unelevated
        rounded
        color="primary"
        icon="fas fa-play"
        label="View Release"
        class="!flex-none"
        :to="{
          name: 'artist.album',
          params: { artist_id: release.artist?.username, album_id: release.slug },
        }"
        v-if="release.artist?.username"
      />
      <q-btn
        no-caps
        outline
        rounded
        color="primary"
        icon="fas fa-share-nodes"
        label="Copy Link"
        class="!flex-none"
        @click="copyLink"
        v-if="release.artist?.username"
      />
      <q-btn
        no-caps
        flat
        rounded
        icon="fas fa-compact-disc"
        label="My Releases"
        class="!flex-none"
        :to="{ name: 'studio.releases' }"
      />
      <q-btn
        no-caps
        flat
        rounded
        icon="fas fa-pen"
        label="Edit Release"
        class="!flex-none"
        @click="emit('edit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard } from 'quasar';
import { useRouter } from 'vue-router';
import placeholder from 'src/assets/placeholder.svg';
import { frontUrl } from 'src/utils/env';
import { notify } from 'src/utils/helpers';
import type { Release } from 'src/utils/models';

const props = defineProps<{ release: Release }>();
const emit = defineEmits<{ edit: [] }>();
const router = useRouter();

const copyLink = () => {
  const path = router.resolve({
    name: 'artist.album',
    params: { artist_id: props.release.artist?.username, album_id: props.release.slug },
  }).href;

  copyToClipboard(frontUrl + path).then(() => notify('Link copied.', 'success'));
};
</script>

<style lang="scss" scoped>
.release-art {
  position: relative;
  width: 180px;

  &__badge {
    position: absolute;
    right: -14px;
    bottom: -14px;
    background: var(--q-dark-page, #121212);
    border-radius: 50%;
  }
}
</style>
