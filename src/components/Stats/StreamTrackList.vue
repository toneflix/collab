<template>
  <div>
    <q-list separator v-if="tracks.length">
      <q-item
        clickable
        :key="track.id"
        :to="{ name: 'studio.stats', params: { type: 'track', id: track.id } }"
        v-for="track in tracks"
      >
        <q-item-section avatar>
          <q-avatar rounded color="grey-9" icon="lucide-music">
            <img :src="track.imageUrl" v-if="track.imageUrl" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="font-bold" lines="1">{{ track.title }}</q-item-label>
          <q-item-label caption lines="1">
            {{ originLabel(track.origin) }}
            <template v-if="track.album"> · {{ track.album }}</template>
          </q-item-label>
          <q-item-label caption>
            {{ count(track.plays, 'play') }} · {{ count(track.paid, 'paid stream') }}
            <span class="text-orange-4" v-if="track.held"> · {{ track.held }} held</span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label class="font-bold text-white">{{ price(track.earned) }}</q-item-label>
          <q-item-label caption v-if="monthInfo && !monthInfo.settled">estimate</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <ListSkeleton side :rows="3" v-else-if="loading" />
    <SimpleInfo v-else text="No released tracks here yet." />

    <div class="flex justify-center mt-6" v-if="pageCount > 1">
      <q-pagination class="flex-none!" v-model="page" :max="pageCount" direction-links />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { loadStreamTracksRequest } from 'src/utils/requests/payments';
import { count, originLabel } from 'src/utils/stream-stats';

const props = defineProps<{
  /** YYYY-MM */
  month: string;
  releaseId?: number;
  projectId?: number;
}>();

const { price } = usePayments();
const page = ref(1);

const filters = computed(() => `${props.month}:${props.releaseId || ''}:${props.projectId || ''}`);

watch(filters, () => (page.value = 1));

const { data, loading } = useWatcher(
  () =>
    loadStreamTracksRequest({
      month: props.month,
      release_id: props.releaseId,
      project_id: props.projectId,
      page: page.value,
      limit: 15,
    }),
  [filters, page],
  { immediate: true },
);

const tracks = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const monthInfo = computed(() => data.value?.month);
</script>
