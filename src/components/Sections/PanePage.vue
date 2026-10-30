<template>
  <q-page class="pane-page" :style-fn="fill">
    <header class="pane-page__head">
      <h1 class="pane-page__title">{{ title }}</h1>
      <p class="pane-page__subtitle" v-if="$slots.subtitle">
        <slot name="subtitle" />
      </p>
    </header>

    <div class="pane-page__body">
      <slot />
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();

/** Fills the space under the app header, so list and detail panes scroll on their own */
const fill = (offset: number) => ({ height: offset ? `calc(100vh - ${offset}px)` : '100vh' });
</script>

<style lang="scss" scoped>
.pane-page {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  min-height: 0 !important;
  padding: 0 !important;
  overflow: hidden;

  &__head {
    flex: none;
    padding: 18px 16px 14px;
    border-bottom: 1px solid var(--tf-border);
  }

  &__title {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.2;
  }

  &__subtitle {
    max-width: 880px;
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--tf-text-subtle);
  }

  &__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    flex-wrap: nowrap;
    min-height: 0;

    > :deep(*) {
      flex: 1 1 auto;
      min-height: 0;
    }
  }
}
</style>
