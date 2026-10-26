<template>
  <StudioSheet :dock="dock" v-model="open" @show="emit('show')">
    <q-card dark class="sheet" :class="{ 'sheet--mobile': $q.screen.lt.sm }">
      <header class="sheet__head">
        <div class="min-w-0">
          <div class="text-lg font-bold">{{ title }}</div>
          <div class="text-xs text-grey-5" v-if="caption">{{ caption }}</div>
        </div>
        <IconBtn
          icon="lucide-x"
          class="!flex-none"
          :aria-label="`Close ${title.toLowerCase()}`"
          @click="open = false"
        />
      </header>
      <slot name="top" />
      <div class="sheet__body">
        <slot />
      </div>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import StudioSheet from 'src/components/Studio/StudioSheet.vue';

defineProps<{
  title: string;
  caption?: string;
  /** CSS selector of the column the panel docks into on desktop */
  dock?: string;
}>();

const emit = defineEmits<{ show: [] }>();

const open = defineModel<boolean>({ default: false });
</script>

<style lang="scss" scoped>
.sheet {
  display: flex;
  flex-direction: column;
  width: 380px;
  height: calc(100vh - 32px);
  max-height: none !important;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  > * {
    flex: 0 0 auto;
  }

  &--mobile {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 12px 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  > .sheet__body {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    padding: 8px 16px 16px;
    overflow-y: auto;
  }
}
</style>
