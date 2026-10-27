<template>
  <div class="flex flex-wrap items-center gap-2" v-if="track.id">
    <!-- Paid release -->
    <PayButton
      rounded
      unelevated
      color="toneflix"
      icon="lucide-lock-open"
      :label="`Buy ${track.release?.title || 'release'} for ${price(track.price)}`"
      :amount="track.price"
      :body="{ purpose: 'release', id: track.release?.id || '' }"
      @paid="emit('changed')"
      v-if="track.locked && track.release"
    />

    <!-- Offline download -->
    <q-btn
      class="flex-none!"
      rounded
      unelevated
      no-caps
      color="grey-9"
      icon="lucide-download"
      label="Download"
      :loading="downloading"
      @click="download"
      v-if="canDownload"
    />
    <q-btn
      class="flex-none!"
      rounded
      outline
      no-caps
      icon="lucide-crown"
      label="Download with Premium"
      :to="{ name: 'premium' }"
      v-else-if="!track.locked && track.downloadable"
    />

    <!-- Stems -->
    <template v-if="track.stemsForSale">
      <q-btn
        class="flex-none!"
        rounded
        unelevated
        no-caps
        color="grey-9"
        icon="lucide-layers"
        label="Download stems"
        :loading="loadingStems"
        @click="openStems"
        v-if="track.stemsUnlocked"
      />
      <PayButton
        rounded
        unelevated
        color="toneflix"
        icon="lucide-layers"
        :label="`Buy stems for ${price(track.stemsPrice)}`"
        :amount="track.stemsPrice"
        :body="{ purpose: 'stems', id: track.id }"
        @paid="onStemsPaid"
        v-else
      />
    </template>

    <q-dialog v-model="showStems">
      <q-card class="w-full max-w-sm bg-dark">
        <q-card-section class="text-lg font-bold">
          Stems for {{ track.title }}
        </q-card-section>
        <q-list separator>
          <q-item
            clickable
            tag="a"
            target="_blank"
            :href="stem.url"
            :key="stem.id"
            v-for="stem in stems"
          >
            <q-item-section avatar>
              <q-icon name="lucide-audio-waveform" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ stem.title }}</q-item-label>
              <q-item-label caption v-if="stem.size">
                {{ formatBytes(stem.size) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="lucide-download" />
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PayButton from './PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import { formatBytes } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import {
  loadStemDownloadsRequest,
  loadTrackDownloadRequest,
} from 'src/utils/requests/payments';

const props = defineProps<{
  track: Track;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const { price, isPremium } = usePayments();

// Owners and buyers can always download; premium listeners can when the creator allowed it.
const canDownload = computed(
  () =>
    !!props.track.downloadable &&
    !props.track.locked &&
    (isPremium.value || !!props.track.owned || Number(props.track.price) > 0),
);

const downloading = ref(false);
const download = async () => {
  downloading.value = true;
  try {
    const { data } = await loadTrackDownloadRequest(props.track.id).send();
    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.filename;
    link.target = '_blank';
    link.click();
  } finally {
    downloading.value = false;
  }
};

const stems = ref<{ id: number; title: string; size?: number; url: string }[]>(
  [],
);
const showStems = ref(false);
const loadingStems = ref(false);
const openStems = async () => {
  loadingStems.value = true;
  try {
    const { data } = await loadStemDownloadsRequest(props.track.id).send();
    stems.value = data;
    showStems.value = true;
  } finally {
    loadingStems.value = false;
  }
};

const onStemsPaid = () => {
  emit('changed');
  openStems();
};
</script>
