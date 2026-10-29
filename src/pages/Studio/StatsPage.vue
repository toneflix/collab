<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <q-btn
        flat
        dense
        no-caps
        icon="lucide-arrow-left"
        label="Earnings"
        class="mb-4 flex-none!"
        :to="{ name: 'studio.earnings' }"
      />

      <template v-if="report">
        <div class="flex flex-nowrap items-center gap-4 mb-8">
          <q-avatar rounded size="72px" color="grey-9" :icon="typeIcon" class="flex-none!">
            <img :src="report.item.imageUrl" v-if="report.item.imageUrl" />
          </q-avatar>
          <div class="min-w-0">
            <div class="text-xs tracking-wide uppercase text-grey-5">{{ typeLabel }} stats</div>
            <h1 class="text-2xl font-bold truncate">{{ report.item.title }}</h1>
            <div class="flex items-center gap-3 text-sm text-grey-5">
              <span v-if="report.item.type === 'track'">{{ originLabel(report.item.origin) }}</span>
              <router-link class="text-toneflix" :to="publicLink" v-if="publicLink">View page</router-link>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
          <q-card flat bordered class="bg-dark" :key="stat.label" v-for="stat in stats">
            <q-card-section>
              <div class="text-xs text-grey-5">{{ stat.label }}</div>
              <div class="text-lg font-bold">{{ stat.value }}</div>
              <div class="text-xs text-grey-5" v-if="stat.caption">{{ stat.caption }}</div>
            </q-card-section>
          </q-card>
        </div>

        <q-banner rounded dense class="mb-6 text-white bg-orange-10" v-if="report.totals.held">
          {{ count(report.totals.held, 'paid stream') }} are held while we check where they came from.
          They're paid once cleared.
        </q-banner>

        <q-card flat bordered class="mb-8 bg-dark">
          <q-card-section>
            <StreamStatsChart :months="report.months" />
          </q-card-section>
        </q-card>

        <template v-if="report.item.type !== 'track'">
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <div class="font-bold">Tracks</div>
            <q-select
              dense
              outlined
              emit-value
              map-options
              class="ml-auto min-w-44 flex-none!"
              :options="months"
              v-model="month"
            />
          </div>
          <StreamTrackList
            :month="month"
            :release-id="report.item.type === 'album' ? report.item.id : undefined"
            :project-id="report.item.type === 'project' ? report.item.id : undefined"
          />
        </template>
      </template>

      <BlockSkeleton v-else-if="loading" />
      <SimpleInfo v-else :text="error || 'These stats are not available.'" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { date, useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { useRequest } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import StreamStatsChart from 'src/components/Stats/StreamStatsChart.vue';
import StreamTrackList from 'src/components/Stats/StreamTrackList.vue';
import { usePayments } from 'src/composables/usePayments';
import { loadStreamStatsRequest, type StatsType } from 'src/utils/requests/payments';
import { count, monthOptions, originLabel } from 'src/utils/stream-stats';

const route = useRoute();
const { price } = usePayments();

const type = route.params.type as StatsType;
const labels: Record<StatsType, string> = { track: 'Track', album: 'Album', project: 'Project' };
const icons: Record<StatsType, string> = { track: 'lucide-music', album: 'lucide-disc-3', project: 'lucide-folder-open' };

const { data, loading, error: failed } = useRequest(() => loadStreamStatsRequest(type, String(route.params.id)));

const report = computed(() => data.value?.data);
const error = computed(() => (failed.value as { message?: string } | undefined)?.message);
const typeLabel = computed(() => labels[type] || 'Stream');
const typeIcon = computed(() => icons[type] || 'lucide-audio-lines');

const month = ref(date.formatDate(new Date(), 'YYYY-MM'));
const months = computed(() => monthOptions(report.value?.months || []));

const stats = computed(() => {
  const totals = report.value?.totals;
  if (!totals) return [];

  return [
    { label: 'Plays', value: totals.plays.toLocaleString(), caption: 'All time' },
    { label: 'Listeners', value: totals.listeners.toLocaleString(), caption: 'Signed in, all time' },
    { label: 'Paid streams', value: totals.paid.toLocaleString(), caption: 'Last 12 months' },
    { label: 'Earned', value: price(totals.earned), caption: 'Last 12 months' },
  ];
});

const publicLink = computed(() => {
  const item = report.value?.item;
  if (!item) return null;

  if (item.type === 'project') return { name: 'project', params: { project_id: item.slug } };
  if (!item.artist) return null;

  return item.type === 'track'
    ? { name: 'artist.track', params: { artist_id: item.artist, track_id: item.slug } }
    : { name: 'artist.album', params: { artist_id: item.artist, album_id: item.slug } };
});

useMeta(() => ({
  title: report.value ? `${report.value.item.title} stats` : 'Stats',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
