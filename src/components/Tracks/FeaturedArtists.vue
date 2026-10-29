<template>
  <!-- The artists a track features, as links after "feat.". Renders nothing without features. -->
  <span class="featured-artists" v-if="artists.length">
    <span> feat. </span>
    <template :key="artist.id" v-for="(artist, i) in artists">
      <span
        role="link"
        tabindex="0"
        class="cursor-pointer hover:underline"
        @click.prevent.stop="go(artist)"
        @keydown.enter.prevent.stop="go(artist)"
        v-if="nested"
      >{{ artist.name }}</span>
      <RouterLink :to="to(artist)" class="hover:underline" @click.stop="emit('navigate')" v-else>{{ artist.name }}</RouterLink>
      <span v-if="i < artists.length - 2">, </span>
      <span v-else-if="i === artists.length - 2"> &amp; </span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { ArtistCredit, Track } from 'src/utils/models';

const props = defineProps<{
  track: Pick<Track, 'featured'>;
  /** Inside another link: renders spans that navigate on click instead of nested anchors */
  nested?: boolean;
}>();

const emit = defineEmits<{ navigate: [] }>();

const router = useRouter();

const artists = computed(() => props.track.featured ?? []);

const to = (artist: ArtistCredit) => ({
  name: 'artist',
  params: { artist_id: artist.username || artist.id },
});

const go = (artist: ArtistCredit) => {
  emit('navigate');
  void router.push(to(artist));
};
</script>
