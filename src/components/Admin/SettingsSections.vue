<template>
  <div class="settings" :class="{ 'settings--open': picked }">
    <nav class="settings__list">
      <router-link
        class="settings__item"
        :class="{ 'settings__item--on': section.key === current }"
        :key="section.key"
        :to="{ query: { ...route.query, section: section.key } }"
        replace
        v-for="section in sections"
      >
        <q-icon class="settings__icon" size="18px" :name="section.icon" />
        <div class="min-w-0 settings__text">
          <div class="flex items-center gap-2 font-bold">
            <span class="flex-none!">{{ section.title }}</span>
            <span
              class="settings__dot"
              title="Unsaved changes"
              v-if="marked.includes(section.key)"
            />
            <q-badge
              rounded
              class="flex-none!"
              :color="section.countColor ?? 'toneflix'"
              :label="section.count"
              v-if="section.count"
            />
          </div>
          <div class="text-sm text-grey-5">{{ section.caption }}</div>
        </div>
        <q-icon
          class="settings__chevron"
          size="14px"
          name="lucide-chevron-right"
        />
      </router-link>
    </nav>

    <section class="settings__panel" v-if="active">
      <header class="settings__head">
        <IconBtn size="sm"
          class="settings__back"
          icon="lucide-arrow-left"
          aria-label="All sections"
          :to="{ query: { ...route.query, section: undefined } }"
        />
        <div class="min-w-0">
          <h2 class="text-xl font-bold">{{ active.title }}</h2>
          <p class="text-grey-5">{{ active.caption }}</p>
        </div>
      </header>

      <div
        class="settings__body"
        :class="{ 'settings__body--flush': active.flush }"
      >
        <slot :name="active.key">
          <slot :section="active.key" />
        </slot>
      </div>

      <footer class="settings__foot" v-if="$slots.footer && !active.hideFooter">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts" generic="K extends string = string">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

export type SettingsSection<K extends string = string> = {
  key: K;
  icon: string;
  title: string;
  caption: string;
  /** A number shown beside the title, like items waiting */
  count?: number;
  countColor?: string;
  /** Content that runs to the panel's edges, like lists */
  flush?: boolean;
  /** Leave out the footer, for sections with nothing to save */
  hideFooter?: boolean;
};

const props = withDefaults(
  defineProps<{
    sections: SettingsSection<K>[];
    /** Sections with unsaved changes */
    marked?: string[];
  }>(),
  { marked: () => [] },
);

const route = useRoute();

/** The section picked in the URL; phones show the list until there is one. */
const picked = computed(
  () =>
    props.sections.find((section) => section.key === route.query.section)
      ?.key ?? null,
);
const current = computed(() => picked.value ?? props.sections[0]?.key);
const active = computed(() =>
  props.sections.find((section) => section.key === current.value),
);

/** The section on show, for pages that load content for it */
const model = defineModel<K>();

watch(
  current,
  (key) => {
    if (key) model.value = key;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
$line: rgba(255, 255, 255, 0.08);

// Frameless list and detail panes; on a PanePage each scrolls on its own.
.settings {
  display: grid;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  @media (min-width: 1024px) {
    grid-template-columns: 320px minmax(0, 1fr);
  }

  &__list {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 8px;
    overflow-y: auto;

    @media (min-width: 1024px) {
      border-right: 1px solid $line;
    }
  }

  &__item {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 14px;
    padding: 14px 14px;
    color: inherit;
    text-decoration: none;
    border-radius: 10px;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    @media (min-width: 1024px) {
      &--on {
        background: rgba(3, 191, 255, 0.07);

        .settings__text > :first-child {
          color: #03bfff;
        }
      }
    }
  }

  &__icon,
  &__chevron {
    flex: none;
    color: rgba(255, 255, 255, 0.6);
  }

  &__text {
    flex: 1 1 auto;
  }

  &__dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffa726;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    gap: 10px;
    padding: 18px 20px 4px;

    > .min-w-0 {
      flex: 1 1 auto;
    }
  }

  &__back {
    flex: none;
    margin: 2px 0 0 -6px;

    @media (min-width: 1024px) {
      display: none;
    }
  }

  &__body {
    padding: 20px;

    &--flush {
      padding: 0;
    }
  }

  &__foot {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    position: sticky;
    bottom: 0;
    margin-top: auto;
    padding: 14px 20px;
    background: var(--tf-bg);
  }

  // Phones show the list, then the picked section on its own.
  @media (max-width: 1023px) {
    &--open &__list,
    &:not(&--open) &__panel {
      display: none;
    }
  }
}
</style>
