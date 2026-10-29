<template>
  <div>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="font-bold">Last 12 months</div>
      <q-btn-toggle
        dense
        rounded
        unelevated
        no-caps
        padding="4px 12px"
        toggle-color="toneflix"
        color="grey-9"
        class="ml-auto flex-none!"
        :options="measures"
        v-model="measure"
      />
    </div>

    <MonthlyBars :months="points" :label="label" :format="format" />

    <div class="mt-3 text-xs text-grey-5" v-if="measure === 'earned'">
      Hatched months aren't paid out yet and are estimated at the last month's rate.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MonthlyBars, { type MonthlyPoint } from 'src/components/Stats/MonthlyBars.vue';
import { usePayments } from 'src/composables/usePayments';
import type { StreamStatsMonth } from 'src/utils/requests/payments';
import { count, measures, type StatsMeasure } from 'src/utils/stream-stats';

const props = defineProps<{ months: StreamStatsMonth[] }>();

const { price } = usePayments();
const measure = ref<StatsMeasure>('earned');

const label = computed(() => measures.find((m) => m.value === measure.value)?.label || '');

const format = (value: number) => (measure.value === 'earned' ? price(value) : value.toLocaleString());

const points = computed<MonthlyPoint[]>(() =>
  props.months.map((m) => ({
    month: m.month,
    value: m[measure.value],
    estimate: measure.value === 'earned' && !m.settled,
    note:
      measure.value === 'paid' && m.held
        ? `${m.held} held for review`
        : measure.value === 'earned' && !m.settled
          ? 'Estimate'
          : measure.value === 'earned'
            ? count(m.paid, 'paid stream')
            : undefined,
  })),
);
</script>
