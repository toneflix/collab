<template>
  <div class="flex flex-col items-center gap-4 px-8 py-12 text-center">
    <div class="release-art !flex-none">
      <q-img
        no-spinner
        :ratio="1"
        :src="release.imageUrl"
        :error-src="placeholder"
        class="rounded-xl"
      />
      <q-icon
        size="44px"
        class="release-art__badge"
        :name="inReview ? 'lucide-clock' : 'lucide-circle-check'"
        :color="inReview ? 'orange' : 'positive'"
      />
    </div>

    <div class="!flex-none">
      <div class="text-3xl font-bold">
        {{ inReview ? 'Submitted for review' : 'Your release is live' }}
      </div>
      <div class="mt-2 text-lg text-grey-5">
        {{ release.title }}<template v-if="release.version"> · {{ release.version }}</template>
        <template v-if="inReview">
          goes live once an admin approves it. We'll let you know.
        </template>
        <template v-else>is out for everyone to hear.</template>
      </div>
    </div>

    <div class="flex flex-wrap justify-center gap-2 mt-2 !flex-none">
      <q-btn
        no-caps
        unelevated
        rounded
        color="primary"
        icon="lucide-play:fill"
        :label="inReview ? 'Preview Release' : 'View Release'"
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
        icon="lucide-share-2"
        label="Copy Link"
        class="!flex-none"
        @click="copyLink"
        v-if="release.artist?.username && !inReview"
      />
      <q-btn
        no-caps
        flat
        rounded
        icon="lucide-disc-3"
        label="My Releases"
        class="!flex-none"
        :to="{ name: 'studio.releases' }"
      />
      <q-btn
        no-caps
        flat
        rounded
        icon="lucide-pen"
        label="Edit Release"
        class="!flex-none"
        @click="emit('edit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard } from 'quasar';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import placeholder from 'src/assets/placeholder.svg';
import { frontUrl } from 'src/utils/env';
import { notify } from 'src/utils/helpers';
import type { Release } from 'src/utils/models';

const props = defineProps<{ release: Release }>();
const emit = defineEmits<{ edit: [] }>();
const router = useRouter();
const inReview = computed(() => props.release.reviewStatus === 'pending');

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
