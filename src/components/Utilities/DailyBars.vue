<template>
  <div class="daily-bars" role="img" :aria-label="label">
    <div
      class="daily-bars__bar"
      :style="{ height: `${Math.max(2, (day.value / max) * 100)}%` }"
      :key="day.date"
      v-for="day in days"
    >
      <q-tooltip>{{ formatDate(day.date) }} · {{ format(day.value) }}</q-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DailyValue } from 'src/utils/requests/adminStats';

const props = withDefaults(
  defineProps<{ days: DailyValue[]; label: string; format?: (value: number) => string }>(),
  { format: (value: number) => value.toLocaleString() },
);

const max = computed(() => Math.max(1, ...props.days.map((d) => d.value)));
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
</script>

<style lang="scss" scoped>
.daily-bars {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 3px;
  height: 64px;

  &__bar {
    flex: 1 1 0;
    min-width: 0;
    border-radius: 2px 2px 0 0;
    background: rgba(0, 149, 255, 0.55);
    transition: background 0.15s;

    &:hover {
      background: #0095ff;
    }
  }
}
</style>
