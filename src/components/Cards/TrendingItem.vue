<template>
  <div>
    <q-item
      class="py-0 pl-3"
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
      <q-item-section avatar class="pr-3 min-w-10">
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
        <q-item-label caption class="mt-0">
          {{ track.artist?.name || 'Unknown' }}
        </q-item-label>
      </q-item-section>

      <q-item-section side>
        <div class="flex flex-row items-center gap-2">
          {{ formatSeconds(track.duration) }}
          <VaButton
            size="medium"
            preset="plain"
            color="textPrimary"
            hover-opacity="0.8"
            @click.prevent="togglePlay"
          >
            <q-icon
              :name="
                track.locked
                  ? 'fas fa-lock'
                  : player.isPlaying(track)
                    ? ionPauseCircle
                    : ionPlayCircle
              "
            />
            <q-tooltip v-if="track.locked">
              Part of a paid release
            </q-tooltip>
          </VaButton>
        </div>
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { ionPauseCircle, ionPlayCircle } from '@quasar/extras/ionicons-v8';
import { formatSeconds } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import { PropType } from 'vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
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
});

const track = defineModel<Track>('track', {
  required: true,
});

const player = usePlayerStore();

const togglePlay = () => {
  player.toggleTrack(track.value, props.queue, props.source);
};

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};
</script>
