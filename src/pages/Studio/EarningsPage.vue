<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <h1 class="mb-1 text-2xl font-bold">Earnings</h1>
      <p class="mb-4 text-sm text-grey-5">
        What you've earned from release sales, stem sales and tips. You keep
        {{ share }}% of each payment.
      </p>

      <div class="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
        <q-card flat bordered class="col-span-2 bg-dark md:col-span-1">
          <q-card-section>
            <div class="text-xs text-grey-5">Total earned</div>
            <div class="text-2xl font-bold">{{ price(summary.earned) }}</div>
          </q-card-section>
        </q-card>
        <q-card
          flat
          bordered
          class="bg-dark"
          :key="kind.key"
          v-for="kind in kinds"
        >
          <q-card-section>
            <div class="text-xs text-grey-5">{{ kind.label }}</div>
            <div class="text-lg font-bold">
              {{ price(summary.byPurpose[kind.key]?.earned) }}
            </div>
            <div class="text-xs text-grey-5">
              {{ summary.byPurpose[kind.key]?.count || 0 }} payments
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-tabs
        dense
        no-caps
        align="left"
        class="mb-2"
        active-color="toneflix"
        v-model="purpose"
      >
        <q-tab name="" label="All" />
        <q-tab
          :key="kind.key"
          :name="kind.key"
          :label="kind.label"
          v-for="kind in kinds"
        />
      </q-tabs>

      <q-list separator v-if="earnings.length">
        <TransactionItem
          :key="transaction.id"
          :transaction="transaction"
          v-for="transaction in earnings"
        />
      </q-list>
      <div class="py-10 text-center" v-else-if="loading">
        <q-spinner size="32px" />
      </div>
      <SimpleInfo
        v-else
        text="No earnings yet. Set a price on a release or its stems in your releases, and fans can tip you from your profile."
      />

      <div class="flex justify-center mt-4" v-if="pageCount > 1">
        <q-pagination class="!flex-none" v-model="page" :max="pageCount" direction-links />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import TransactionItem from 'src/components/Payments/TransactionItem.vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Earnings } from 'src/utils/models';
import { loadEarningsRequest } from 'src/utils/requests/payments';

const { price } = usePayments();
const boot = useBootstrapStore();
const share = computed(() => Number(boot.configuration.creator_share || 85));

const kinds = [
  { key: 'release' as const, label: 'Releases' },
  { key: 'stems' as const, label: 'Stems' },
  { key: 'tip' as const, label: 'Tips' },
];

const purpose = ref('');
const page = ref(1);

watch(purpose, () => (page.value = 1));

const { data, loading } = useWatcher(
  () => loadEarningsRequest({ purpose: purpose.value, page: page.value, limit: 20 }),
  [purpose, page],
  { immediate: true },
);

const earnings = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.last_page || 1);
const summary = computed<Earnings>(
  () => data.value?.summary || { earned: 0, currency: '', byPurpose: {} },
);

useMeta(() => ({
  title: 'Earnings',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
