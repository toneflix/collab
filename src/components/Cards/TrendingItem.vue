<template>
  <div>
    <q-item
      class="py-0 pl-3"
      active-class="text-white"
      :to="{
        name: 'artist.track',
        params: {
          artist_id: track.artist?.username || track.artist_id,
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
        <q-item-label caption lines="1" class="mt-0">
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
                  : playing
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
import { EventBus } from 'quasar';
import { formatSeconds } from 'src/utils/helpers';
import {
  CollabEvents,
  SeekingData,
  StopEventKeywords,
  Track,
} from 'src/utils/models';
import { inject } from 'vue';
import { ref } from 'vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
  togglePlay: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  isLast: Boolean,
});

const track = defineModel<Track>('track', {
  required: true,
});

const playing = ref(false);
const seeking = ref<SeekingData>({} as unknown & SeekingData);

const bus = inject<EventBus<CollabEvents>>('bus');

const togglePlay = () => {
  playing.value = !playing.value;
  bus?.emit('togglePlay', playing.value, track.value, undefined, 'trend');
  emit('togglePlay', playing.value);
};

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};

bus?.on('seeking', (position, trk, url) => {
  if (trk?.id === track.value.id) {
    seeking.value = { position, track: trk, url };
    playing.value = position > 0;
  } else {
    seeking.value = {} as unknown & SeekingData;
    playing.value = false;
  }
});

bus?.on('togglePlay', (status, trk, album, origin) => {
  if (origin !== 'trend' && trk.id === track.value.id) {
    playing.value = status;
    emit('togglePlay', playing.value);
  }
});

const evts: StopEventKeywords[] = ['stop', 'pause', 'end'];
evts.forEach((evt) => {
  bus?.on(evt, (pos, trk) => {
    if (trk.id === track.value.id) playing.value = false;
  });
});
</script>
