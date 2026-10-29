<template>
  <div>
    <div class="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4" v-if="current">
      <q-card flat bordered class="bg-dark" :key="stat.label" v-for="stat in stats">
        <q-card-section>
          <div class="text-xs text-grey-5">{{ stat.label }}</div>
          <div class="text-lg font-bold">{{ stat.value }}</div>
          <div class="text-xs text-grey-5" v-if="stat.caption">{{ stat.caption }}</div>
        </q-card-section>
      </q-card>
    </div>

    <div class="flex items-center gap-3 mb-3">
      <div class="font-bold">Paid out months</div>
      <q-btn
        outline
        rounded
        no-caps
        size="sm"
        color="white"
        icon="lucide-calendar"
        label="Pay out a month"
        class="ml-auto flex-none!"
        @click="pick"
      />
    </div>

    <q-list separator v-if="periods.length">
      <q-item :key="period.id" v-for="period in periods">
        <q-item-section avatar>
          <q-avatar rounded color="grey-9" icon="lucide-audio-lines" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="font-bold">{{ monthName(period.month) }}</q-item-label>
          <q-item-label caption>
            {{ count(period.plays, 'paid stream') }} · {{ count(period.earners, 'creator') }} · {{ price(period.rate) }} per weighted stream
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label class="font-bold text-white">{{ price(period.paidOut) }}</q-item-label>
          <q-item-label caption>of {{ price(period.pool) }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <ListSkeleton side :rows="3" v-else-if="loading" />
    <SimpleInfo v-else text="No months paid out yet. Each month is paid out on the 1st." />

    <div class="flex justify-center mt-6" v-if="pageCount > 1">
      <q-pagination class="flex-none!" v-model="page" :max="pageCount" direction-links />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { date, useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import { loadAdminStreamsRequest, payoutError, settleStreamsRequest } from 'src/utils/requests/payouts';

const $q = useQuasar();
const { price } = usePayments();

const page = ref(1);
const { data, loading, send: reload } = useWatcher(() => loadAdminStreamsRequest(page.value), [page], { immediate: true });

const periods = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const current = computed(() => data.value?.current);

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

const monthName = (month: string) => date.formatDate(`${month}-01`, 'MMMM YYYY');

const stats = computed(() => {
  const c = current.value;
  if (!c) return [];

  return [
    { label: 'Premium revenue this month', value: price(c.revenue) },
    { label: 'Stream pool', value: price(c.pool), caption: `${c.share}% of revenue` },
    { label: 'Paid streams', value: String(c.plays), caption: `${c.weighted} weighted` },
    { label: 'Per weighted stream so far', value: price(c.rate) },
  ];
});

const lastMonth = () => date.formatDate(date.subtractFromDate(new Date(), { months: 1 }), 'YYYY-MM');

const pick = () => {
  $q.dialog({
    dark: true,
    title: 'Pay out a month',
    message: 'Creators get their share of that month\'s pool now. A month already paid out is left as it is.',
    prompt: { model: lastMonth(), type: 'month', outlined: true, dark: true, label: 'Month' },
    cancel: { flat: true, noCaps: true, label: 'Cancel' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'toneflix', label: 'Pay out' },
  }).onOk((month: string) => void settle(month));
};

const settle = async (month: string) => {
  try {
    const body = await settleStreamsRequest(month).send();
    notify(body.message, 'success');
    void reload();
  } catch (e) {
    notify(payoutError(e, 'That month couldn\'t be paid out.'), 'error');
  }
};
</script>
