<template>
  <div class="admin-layout">
    <nav class="admin-layout__nav" aria-label="Admin pages">
      <div class="admin-layout__title">Admin</div>

      <q-list dense class="admin-layout__list" v-if="$q.screen.gt.sm">
        <q-item
          exact
          clickable
          v-ripple
          active-class="admin-layout__item--active"
          class="admin-layout__item"
          :to="{ name: 'admin' }"
        >
          <q-item-section avatar>
            <q-icon name="fas fa-gauge" size="16px" />
          </q-item-section>
          <q-item-section>Overview</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          active-class="admin-layout__item--active"
          class="admin-layout__item"
          :to="link.to"
          :key="link.title"
          v-for="link in links"
        >
          <q-item-section avatar>
            <q-icon :name="link.icon" size="16px" />
          </q-item-section>
          <q-item-section>{{ link.title }}</q-item-section>
        </q-item>
      </q-list>

      <q-tabs
        dense
        no-caps
        outside-arrows
        mobile-arrows
        align="left"
        active-color="white"
        indicator-color="toneflix"
        class="text-grey-5"
        v-else
      >
        <q-route-tab exact label="Overview" :to="{ name: 'admin' }" />
        <q-route-tab :label="link.title" :to="link.to" :key="link.title" v-for="link in links" />
      </q-tabs>
    </nav>

    <div class="admin-layout__body">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { allowedAdminLinks } from 'src/utils/navigations';

const boot = useBootstrapStore();
const links = computed(() => allowedAdminLinks(boot.user.permissions));
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 16px;

  &__nav {
    position: sticky;
    top: 66px;
    flex: 0 0 220px;
  }

  &__title {
    padding: 8px 12px 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9e9e9e;
  }

  &__item {
    border-radius: 8px;
    margin-bottom: 2px;
    color: #bdbdbd;
  }

  &__item--active {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }

  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  // Admin pages are q-pages; inside this layout they only need their content height.
  &__body :deep(.q-page) {
    min-height: 0 !important;
    padding: 0;
  }

  @media (max-width: 1023px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px 0 0;

    &__nav {
      position: static;
      flex: none;
    }

    &__title {
      display: none;
    }

    &__body :deep(.q-page) {
      padding: 0 16px 16px;
    }
  }
}
</style>
