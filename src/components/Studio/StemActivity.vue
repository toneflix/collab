<template>
  <div
    class="stem-activity"
    :class="{ 'stem-activity--open': open }"
    role="status"
    aria-live="polite"
  >
    <button
      type="button"
      class="stem-activity__head"
      :aria-expanded="open"
      @click="open = !open"
    >
      <q-spinner-audio size="16px" color="toneflix" class="flex-none!" />
      <span class="font-bold">{{ heading }}</span>
      <span class="text-grey-5" v-if="bytes.total"
        >{{ formatBytes(bytes.loaded) }} of {{ formatBytes(bytes.total) }}</span
      >
      <q-linear-progress
        rounded
        color="toneflix"
        track-color="grey-9"
        size="4px"
        class="stem-activity__overall"
        :value="overall"
      />
      <q-icon
        name="lucide-chevron-down"
        size="16px"
        class="stem-activity__chevron"
      />
    </button>

    <div class="stem-activity__list" v-if="open">
      <div class="stem-activity__row" :key="item.key" v-for="item in items">
        <q-icon
          :name="icons[item.phase]"
          size="16px"
          class="text-grey-5 flex-none!"
        />
        <div class="stem-activity__name">{{ item.name }}</div>
        <q-linear-progress
          rounded
          size="3px"
          track-color="grey-9"
          :color="item.phase === 'upload' ? 'amber-5' : 'toneflix'"
          :indeterminate="!fraction(item)"
          :value="fraction(item) ?? 0"
          class="stem-activity__bar"
        />
        <div class="stem-activity__label">{{ label(item) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

export type ActivityPhase = 'download' | 'cached' | 'decode' | 'upload';

export interface StemActivityItem {
  key: string;
  name: string;
  phase: ActivityPhase;
  loaded: number;
  total: number;
}

/**
 * What the stem editor is busy with: stems downloading, being read from this
 * device, being prepared for the timeline, or uploading in the background.
 * It floats over the top of the timeline and shows only the overall progress
 * until it is clicked.
 */
const props = defineProps<{
  items: StemActivityItem[];
  /** Stems already finished in this round, for the "3 of 5" count */
  finished: number;
}>();

const open = ref(false);

const icons: Record<ActivityPhase, string> = {
  download: 'lucide-cloud-download',
  cached: 'lucide-smartphone',
  decode: 'lucide-activity',
  upload: 'lucide-cloud-upload',
};

const loading = computed(
  () => props.items.filter((i) => i.phase !== 'upload').length,
);
const uploading = computed(() => props.items.length - loading.value);

const heading = computed(() => {
  const parts: string[] = [];
  if (loading.value) {
    const all = loading.value + props.finished;
    parts.push(
      all > 1
        ? `Loading stems, ${props.finished} of ${all} ready`
        : 'Loading 1 stem',
    );
  }
  if (uploading.value)
    parts.push(
      `Uploading ${uploading.value} ${uploading.value === 1 ? 'stem' : 'stems'}`,
    );
  return parts.join(' · ');
});

const bytes = computed(() =>
  props.items.reduce(
    (sum, i) => ({
      loaded: sum.loaded + Math.min(i.loaded, i.total || i.loaded),
      total: sum.total + i.total,
    }),
    { loaded: 0, total: 0 },
  ),
);

/** Overall progress, counting finished stems as whole ones. */
const overall = computed(() => {
  const parts = props.items.map((i) =>
    i.phase === 'decode' ? 0.95 : (fraction(i) ?? 0),
  );
  const all = parts.length + props.finished;
  return all ? (parts.reduce((a, b) => a + b, 0) + props.finished) / all : 0;
});

const fraction = (item: StemActivityItem): number | null => {
  if (item.phase === 'decode' || !item.total) return null;
  return Math.min(1, item.loaded / item.total);
};

const label = (item: StemActivityItem) => {
  const pct = fraction(item);
  switch (item.phase) {
    case 'cached':
      return 'From this device';
    case 'decode':
      return 'Drawing waveform';
    case 'upload':
      return pct === null
        ? 'Uploading'
        : pct >= 1
          ? 'Saving'
          : `Uploading ${Math.round(pct * 100)}%`;
    default:
      if (!item.loaded) return 'Waiting';
      return pct === null
        ? formatBytes(item.loaded)
        : `${Math.round(pct * 100)}%`;
  }
};

const formatBytes = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
</script>

<style lang="scss" scoped>
.stem-activity {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(520px, calc(100% - 24px));
  padding: 6px;
  font-size: 0.8rem;
  transform: translateX(-50%);
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: color-mix(in srgb, var(--tf-surface-2) 82%, transparent);
  box-shadow: var(--tf-shadow-md);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);

  &--open {
    width: min(760px, calc(100% - 24px));
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 4px 6px;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border: 0;
    border-radius: var(--tf-radius-md);
    background: transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    > * {
      flex: none;
    }
  }

  &__overall {
    flex: 1 1 80px;
    min-width: 60px;
  }

  &__chevron {
    color: var(--tf-text-muted);
    transition: transform var(--tf-duration) var(--tf-ease);
  }

  &--open &__chevron {
    transform: rotate(180deg);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 4px 20px;
    max-height: 120px;
    padding: 2px 6px 4px;
    overflow-y: auto;
  }

  &__row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__name {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__bar {
    flex: 1 1 60px;
    min-width: 40px;
  }

  &__label {
    flex: none;
    min-width: 6.5em;
    color: var(--tf-text-muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}
</style>
