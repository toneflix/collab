<template>
  <q-page padding>
    <div class="max-w-4xl">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">Admin</h1>
        <p class="text-grey-5">Everything you can manage, in one place.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" v-if="links.length">
        <router-link :to="link.to" class="admin-card" :key="link.title" v-for="link in links">
          <q-avatar size="40px" color="grey-9" text-color="white" class="!flex-none">
            <q-icon :name="link.icon" size="18px" />
          </q-avatar>
          <div class="min-w-0">
            <div class="font-bold">{{ link.title }}</div>
            <div class="text-sm text-grey-5">{{ link.caption }}</div>
          </div>
        </router-link>
      </div>

      <div class="py-10 text-center text-grey-5" v-else>
        Your account has no admin permissions.
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { allowedAdminLinks } from 'src/utils/navigations';

const boot = useBootstrapStore();
const links = computed(() => allowedAdminLinks(boot.user.permissions));
</script>

<style lang="scss" scoped>
.admin-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
