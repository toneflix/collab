<template>
  <q-page padding>
    <div class="account">
      <header class="account__header">
        <h1 class="text-2xl font-bold">Settings</h1>
      </header>

      <div class="account__body">
        <nav class="account__nav" aria-label="Settings pages">
          <router-link
            class="account__link"
            active-class="account__link--on"
            :key="link.title"
            :to="link.to"
            v-for="link in accountSettingsLinks"
          >
            <q-icon :name="link.icon" size="18px" class="account__icon" />
            <span>{{ link.title }}</span>
          </router-link>

          <div class="account__more">
            <div class="account__more-label">Elsewhere</div>
            <router-link
              class="account__link"
              :key="link.title"
              :to="link.to"
              v-for="link in accountElsewhereLinks"
            >
              <q-icon :name="link.icon" size="18px" class="account__icon" />
              <span>{{ link.title }}</span>
              <q-icon
                name="lucide-arrow-up-right"
                size="14px"
                class="account__icon ml-auto"
              />
            </router-link>
          </div>
        </nav>

        <main class="account__page">
          <div class="account__intro" v-if="current">
            <h2 class="text-xl font-bold">{{ current.title }}</h2>
            <p class="text-fg-muted">{{ current.caption }}</p>
          </div>
          <router-view />
        </main>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  accountElsewhereLinks,
  accountSettingsLinks,
} from 'src/utils/navigations';

const route = useRoute();

const current = computed(() =>
  accountSettingsLinks.find((link) => link.to.name === route.name),
);
</script>

<style lang="scss" scoped>
.account {
  max-width: 1000px;
  margin: 0 auto;

  &__header {
    margin-bottom: 20px;
  }

  &__intro {
    margin-bottom: 16px;
  }

  &__body {
    display: grid;
    gap: 24px;

    @media (min-width: 1024px) {
      grid-template-columns: 220px minmax(0, 1fr);
      align-items: start;
    }
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 2px;

    @media (min-width: 1024px) {
      position: sticky;
      top: 66px;
    }

    // Phones get a scrolling row of page tabs.
    @media (max-width: 1023px) {
      flex-direction: row;
      gap: 8px;
      margin: 0 -16px;
      padding: 0 16px 4px;
      overflow-x: auto;
      scrollbar-width: none;
    }
  }

  &__link {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    color: var(--tf-text-muted);
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    border-radius: var(--tf-radius-md);
    transition:
      background var(--tf-duration) var(--tf-ease),
      color var(--tf-duration) var(--tf-ease);

    > * {
      flex: none;
    }

    &:hover {
      color: var(--tf-text);
      background: var(--tf-surface-2);
    }

    &--on,
    &--on:hover {
      color: var(--tf-primary);
      background: var(--tf-primary-soft);
    }

    @media (max-width: 1023px) {
      gap: 8px;
      padding: 7px 14px;
      border: 1px solid var(--tf-border);
      border-radius: var(--tf-radius-full);

      &--on {
        border-color: transparent;
      }
    }
  }

  &__icon {
    color: inherit;
  }

  &__more {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--tf-border);

    @media (max-width: 1023px) {
      display: none;
    }
  }

  &__more-label {
    padding: 0 12px 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--tf-text-subtle);
  }

  &__page {
    min-width: 0;
    max-width: 720px;
  }
}
</style>
