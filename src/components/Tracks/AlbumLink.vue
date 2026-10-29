<template>
  <!-- The track's album as a link, after a separator. Renders nothing for singles. -->
  <span class="album-link" v-if="track.album">
    <span class="mx-1">•</span>
    <span
      role="link"
      tabindex="0"
      class="cursor-pointer hover:underline"
      @click.prevent.stop="go"
      @keydown.enter.prevent.stop="go"
      v-if="nested"
    >{{ track.album.title }}</span>
    <RouterLink :to="to" class="hover:underline" @click.stop="emit('navigate')" v-else>{{ track.album.title }}</RouterLink>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Track } from 'src/utils/models';

const props = defineProps<{
  track: Track;
  /** Inside another link: renders a span that navigates on click instead of a nested anchor */
  nested?: boolean;
}>();

const emit = defineEmits<{ navigate: [] }>();

const router = useRouter();

const to = computed(() => ({
  name: 'artist.album',
  params: {
    artist_id: props.track.artist?.username || props.track.artistId || '-',
    album_id: props.track.album?.slug || '-',
  },
}));

const go = () => {
  emit('navigate');
  void router.push(to.value);
};
</script>
