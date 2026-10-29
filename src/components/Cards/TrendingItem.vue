<template>
  <div class="track-row" v-bind="menuTrigger.listeners(track, menuContext)">
    <q-item
      class="py-0 pl-4"
      active-class="text-white"
      :to="{
        name: 'artist.track',
        params: {
          artist_id: track.artist?.username || track.artistId,
          track_id: track.slug,
        },
      }"
      v-intersection="onIntersect"
    >
      <q-item-section avatar class="pr-4 min-w-10">
        <q-avatar rounded>
          <q-img
            no-spinner
            class="bg-gray-400"
            loading="eager"
            :src="track.imageUrl"
            :ratio="1 / 1"
          />
        </q-avatar>
      </q-item-section>

      <q-item-section>
        <q-item-label
          lines="1"
          class="text-sm font-bold"
          :class="{ 'max-w-52': !dense, 'max-w-36': dense }"
        >
          {{ track.title }}
        </q-item-label>
        <q-item-label caption lines="1" class="mt-0">
          {{ track.artist?.name || 'Unknown' }}<FeaturedArtists nested :track="track" /><AlbumLink nested :track="track" v-if="!hideAlbum" />
        </q-item-label>
      </q-item-section>

      <q-item-section side>
        <div class="flex flex-row items-center gap-2">
          <span class="track-row__duration">{{ formatSeconds(track.duration) }}</span>
          <IconBtn
            :icon="track.locked ? 'lucide-lock' : player.isPlaying(track) ? 'lucide-circle-pause' : 'lucide-circle-play'"
            :label="track.locked ? 'Part of a paid release' : player.isPlaying(track) ? 'Pause' : 'Play'"
            @click.prevent="togglePlay"
          />
          <TrackMenuButton :track="track" :context="menuContext" />
        </div>
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { formatSeconds } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import { PropType } from 'vue';
import AlbumLink from 'src/components/Tracks/AlbumLink.vue';
import TrackMenuButton from 'src/components/Tracks/TrackMenuButton.vue';
import { TrackMenuTrigger, type TrackMenuContext } from 'src/utils/track-menu';
import FeaturedArtists from 'src/components/Tracks/FeaturedArtists.vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  /** Leaves out the album link, for lists already on the album's page */
  hideAlbum: Boolean,
  isLast: Boolean,
  /** The list this track is shown in; playing it queues the whole list */
  queue: {
    type: Array as PropType<Track[]>,
    default: undefined,
  },
  /** Names the list, so its play button can show when it's playing */
  source: {
    type: String,
    default: undefined,
  },
  /** Where the track's menu is opened from, e.g. a playlist */
  menuContext: {
    type: Object as PropType<TrackMenuContext>,
    default: undefined,
  },
});

const track = defineModel<Track>('track', {
  required: true,
});

const player = usePlayerStore();
const menuTrigger = new TrackMenuTrigger();

const togglePlay = () => {
  player.toggleTrack(track.value, props.queue, props.source);
};

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};
</script>
