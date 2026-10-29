<template>
  <figure class="monthly-bars" :aria-label="label">
    <div class="monthly-bars__top">
      <span>{{ format(max) }}</span>
    </div>
    <div class="monthly-bars__plot">
      <div
        class="monthly-bars__col"
        tabindex="0"
        :key="point.month"
        v-for="point in points"
      >
        <div
          class="monthly-bars__bar"
          :class="{ 'monthly-bars__bar--estimate': point.estimate }"
          :style="{ height: point.height }"
        />
        <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 6]" class="monthly-bars__tip">
          <div class="text-xs text-grey-5">{{ point.name }}</div>
          <div class="font-bold">{{ format(point.value) }}</div>
          <div class="text-xs text-grey-5" v-if="point.note">{{ point.note }}</div>
        </q-tooltip>
      </div>
    </div>
    <div class="monthly-bars__axis">
      <span :key="point.month" v-for="point in points">{{ point.short }}</span>
    </div>

    <table class="sr-only">
      <caption>{{ label }}</caption>
      <tr :key="point.month" v-for="point in points">
        <th scope="row">{{ point.name }}</th>
        <td>{{ format(point.value) }}{{ point.note ? ` (${point.note})` : '' }}</td>
      </tr>
    </table>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { date } from 'quasar';

export type MonthlyPoint = {
  /** YYYY-MM */
  month: string;
  value: number;
  /** Drawn hatched, for months that are still an estimate */
  estimate?: boolean;
  note?: string;
};

const props = withDefaults(
  defineProps<{
    months: MonthlyPoint[];
    label: string;
    format?: (value: number) => string;
  }>(),
  { format: (value: number) => value.toLocaleString() },
);

const max = computed(() => Math.max(0, ...props.months.map((m) => m.value)));

const points = computed(() =>
  props.months.map((m) => {
    const day = `${m.month}-01`;
    const share = max.value > 0 ? m.value / max.value : 0;

    return {
      ...m,
      name: date.formatDate(day, 'MMMM YYYY'),
      short: date.formatDate(day, 'MMM'),
      height: m.value > 0 ? `max(3px, ${(share * 100).toFixed(1)}%)` : '0px',
    };
  }),
);
</script>

<style lang="scss" scoped>
.monthly-bars {
  margin: 0;

  &__top {
    display: flex;
    justify-content: flex-end;
    font-size: 0.7rem;
    color: var(--tf-text-subtle);
    border-bottom: 1px dashed var(--tf-border);
    padding-bottom: 2px;
  }

  &__plot {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-end;
    gap: 2px;
    height: 140px;
    border-bottom: 1px solid var(--tf-border-strong);
  }

  &__col {
    display: flex;
    flex: 1 1 0;
    align-items: flex-end;
    justify-content: center;
    min-width: 0;
    height: 100%;
    cursor: default;
    border-radius: var(--tf-radius-sm) var(--tf-radius-sm) 0 0;
    outline: none;

    &:hover,
    &:focus-visible {
      background: var(--tf-surface-2);
    }
  }

  &__bar {
    width: 100%;
    max-width: 28px;
    border-radius: 4px 4px 0 0;
    background: var(--tf-primary);

    &--estimate {
      background: repeating-linear-gradient(
        45deg,
        var(--tf-primary) 0 3px,
        rgb(3 191 255 / 45%) 3px 6px
      );
    }
  }

  &__axis {
    display: flex;
    flex-wrap: nowrap;
    gap: 2px;
    margin-top: 4px;
    font-size: 0.7rem;
    color: var(--tf-text-subtle);

    > span {
      flex: 1 1 0;
      min-width: 0;
      overflow: hidden;
      text-align: center;
      white-space: nowrap;
    }
  }

  @media (max-width: 599px) {
    &__axis > span:nth-child(even) {
      visibility: hidden;
    }
  }
}
</style>
