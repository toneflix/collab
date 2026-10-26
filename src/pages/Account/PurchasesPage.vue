<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold">Purchases</h1>
        <q-btn
          class="!flex-none"
          rounded
          outline
          no-caps
          size="sm"
          icon="lucide-crown"
          label="Premium"
          :to="{ name: 'premium' }"
        />
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
        <q-tab name="release" label="Releases" />
        <q-tab name="stems" label="Stems" />
        <q-tab name="tip" label="Tips" />
        <q-tab name="premium" label="Premium" />
      </q-tabs>

      <q-list separator v-if="purchases.length">
        <TransactionItem
          :key="transaction.id"
          :transaction="transaction"
          v-for="transaction in purchases"
        />
      </q-list>
      <div class="py-10 text-center" v-else-if="loading">
        <q-spinner size="32px" />
      </div>
      <SimpleInfo
        v-else
        text="Nothing here yet. Releases, stems, tips and Premium you pay for show up here."
      />

      <div class="flex justify-center mt-8" v-if="pageCount > 1">
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
import { loadPurchasesRequest } from 'src/utils/requests/payments';

const purpose = ref('');
const page = ref(1);

const { data, loading } = useWatcher(
  () => loadPurchasesRequest({ purpose: purpose.value, page: page.value, limit: 20 }),
  [purpose, page],
  { immediate: true, initialData: { data: [] } },
);

watch(purpose, () => (page.value = 1));

const purchases = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

useMeta(() => ({
  title: 'Purchases',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
