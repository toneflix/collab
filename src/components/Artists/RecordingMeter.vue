<template>
  <div class="meter">
    <span class="meter__dot flex-none!" />
    <span class="meter__time flex-none!">{{ clock(elapsed) }} / {{ clock(max) }}</span>
    <div class="meter__bars">
      <span class="meter__bar" :style="{ height: `${Math.max(8, level * 100)}%` }" :key="i" v-for="(level, i) in levels" />
    </div>
  </div>
  <div class="mt-1 text-xs text-grey-6" v-if="min && elapsed < min">Keep going for at least {{ clock(min) }}.</div>
</template>

<script setup lang="ts">
/**
 * A live recording's time and loudness while the microphone is on.
 */
defineProps<{ elapsed: number; levels: number[]; max: number; min?: number }>();

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
</script>

<style scoped>
.meter {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 40px;
}

.meter__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--q-negative);
  animation: pulse 1s ease-in-out infinite;
}

.meter__time {
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
}

.meter__bars {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
  min-width: 0;
}

.meter__bar {
  flex: 0 0 3px;
  border-radius: 2px;
  background: var(--q-toneflix, #e91e63);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
</style>
