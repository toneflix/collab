<template>
  <div class="profile-dropdown-wrapper">
    <q-btn-dropdown
      dense
      rounded
      no-caps
      color="grey-9"
      class="q-mx-sm header-avatar"
      content-class="user-dropdown-content"
      :menu-offset="[3, 2]"
    >
      <template v-slot:label>
        <q-avatar clickable color="white" size="25px" v-if="user.id">
          <img :src="user.imageUrl" />
        </q-avatar>
        <q-icon class="rounded-full bg-grey" v-else name="lucide-user" />
        <span class="ml-2 mr-6">{{ user.fullname || 'Guest' }}</span>
        <q-icon
          name="lucide-crown"
          color="amber-7"
          size="12px"
          class="-ml-5 mr-8"
          v-if="user.badge"
        />
      </template>
      <div class="q-pa-md">
        <div class="column">
          <q-list class="user-dropdown">
            <q-item
              clickable
              v-ripple
              class="user-card"
              :to="{ name: 'user', params: { artist_id: user.username } }"
              v-if="user.id"
            >
              <q-item-section avatar>
                <q-avatar>
                  <img :src="user.imageUrl" />
                </q-avatar>
              </q-item-section>

              <q-item-section
                class="text-weight-bold text-h6"
                style="font-size: 1rem"
              >
                {{ user.fullname }}
              </q-item-section>
            </q-item>

            <q-separator class="q-my-xs" v-if="user.id" />

            <template v-for="group in options">
              <q-item-label
                header
                class="px-3 pt-3 pb-1 text-xs uppercase tracking-wider"
                :key="group.name + 'label'"
                v-if="group.name"
              >
                {{ group.name }}
              </q-item-label>
              <q-item
                dense
                clickable
                active-class="text-primary"
                :to="link.to"
                :key="i + group.name"
                v-for="(link, i) in group.list"
              >
                <q-item-section avatar class="min-w-0 pr-3">
                  <q-icon :name="link.icon" size="18px" class="text-fg-muted" />
                </q-item-section>
                <q-item-section>
                  <span class="block first-letter:uppercase">{{ link.name }}</span>
                </q-item-section>
              </q-item>

              <q-separator
                class="q-my-xs"
                :key="group.name + 'sep'"
                v-if="group.separator"
              />
            </template>
          </q-list>
        </div>
      </div>
    </q-btn-dropdown>
  </div>
</template>

<script lang="ts" setup>
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { allowedAdminLinks } from 'src/utils/navigations';
import { computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';

type ProfileListItem = {
  hide?: boolean;
  name: string;
  to?: RouteLocationRaw;
  href?: string;
  icon: string;
};

type ProfileOptions = {
  name: string;
  separator: boolean;
  list: ProfileListItem[];
};

const user = computed(() => useBootstrapStore().user);
const options = computed<ProfileOptions[]>(() =>
  [
    {
      hide: !user.value.id,
      name: 'account',
      separator: true,
      list: [
        {
          name: 'Your page',
          to: { name: 'user', params: { artist_id: user.value.username } },
          icon: 'lucide-circle-user',
        },
        {
          name: 'Settings',
          to: { name: 'account.settings' },
          icon: 'lucide-settings',
        },
        {
          name: 'Notifications',
          to: { name: 'account.notifications' },
          icon: 'lucide-bell',
        },
        {
          name: 'Studio',
          to: { name: 'studio.home' },
          icon: 'lucide-mic',
        },
        {
          name: user.value.isPremium ? 'Premium' : 'Go Premium',
          to: { name: 'premium' },
          icon: 'lucide-crown',
        },
        {
          name: 'Purchases',
          to: { name: 'library.purchases' },
          icon: 'lucide-receipt',
        },
        {
          name: 'Earnings',
          to: { name: 'studio.earnings' },
          icon: 'lucide-circle-dollar-sign',
        },
        {
          name: 'AI credits',
          to: { name: 'studio.credits' },
          icon: 'lucide-wand-sparkles',
        },
        {
          hide: !allowedAdminLinks(user.value.permissions).length,
          name: 'Admin',
          to: { name: 'admin' },
          icon: 'lucide-gauge',
        },
      ].filter((e) => !e.hide),
    },
    {
      name: 'help',
      separator: true,
      list: [
        {
          name: 'FAQ',
          to: { name: 'help', hash: '#faq' },
          icon: 'lucide-circle-question-mark',
        },
        {
          name: 'Help and support',
          to: { name: 'help', hash: '#support' },
          icon: 'lucide-life-buoy',
        },
      ],
    },
    {
      name: '',
      separator: false,
      list: [
        {
          hide: !!user.value.id,
          name: 'Login',
          to: { name: 'auth.login' },
          icon: 'lucide-log-in',
        },
        {
          hide: !user.value.id,
          name: 'Logout',
          to: { name: 'auth.logout' },
          icon: 'lucide-log-out',
        },
      ].filter((e) => !e.hide),
    },
  ].filter((e) => !e.hide),
);
</script>

<style lang="scss">
.profile-dropdown {
  cursor: pointer;

  &__content {
    .menu-item:hover {
      background: var(--hover-color);
    }
  }

  &__anchor {
    display: inline-block;
  }
}
</style>
