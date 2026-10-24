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
        <q-icon class="rounded-full bg-grey" v-else name="person" />
        <span class="ml-2 mr-6">{{ user.fullname || 'Guest' }}</span>
        <q-icon
          name="fas fa-crown"
          color="amber-7"
          size="12px"
          class="-ml-5 mr-4"
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
              :to="{ name: 'account.profile' }"
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
                class="p-2 capitalize"
                :key="group.name + 'label'"
                v-if="group.name"
              >
                {{ group.name }}
              </q-item-label>
              <q-item
                dense
                v-ripple
                clickable
                active-class="text-grey-5"
                :to="link.to"
                :key="i + group.name"
                v-for="(link, i) in group.list"
              >
                <q-item-section avatar>
                  <q-avatar size="sm" color="grey-8">
                    <q-icon :name="link.icon" />
                  </q-avatar>
                </q-item-section>
                <q-item-section class="text-weight-bold">
                  {{ link.name }}
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
          name: 'profile',
          to: 'preferences',
          icon: 'account_circle',
        },
        {
          name: 'settings',
          to: 'settings',
          icon: 'settings',
        },
        {
          name: 'Notifications',
          to: { name: 'account.notifications' },
          icon: 'notifications',
        },
        {
          name: 'Studio',
          to: { name: 'studio.home' },
          icon: 'fas fa-microphone-lines',
        },
        {
          name: user.value.isPremium ? 'Premium' : 'Go Premium',
          to: { name: 'premium' },
          icon: 'fas fa-crown',
        },
        {
          name: 'Purchases',
          to: { name: 'library.purchases' },
          icon: 'fas fa-receipt',
        },
        {
          name: 'Earnings',
          to: { name: 'studio.earnings' },
          icon: 'fas fa-sack-dollar',
        },
        {
          hide: !user.value.permissions?.includes('manage-plans'),
          name: 'Manage plans',
          to: { name: 'admin.plans' },
          icon: 'fas fa-layer-group',
        },
        {
          hide: !user.value.permissions?.includes('manage-configuration'),
          name: 'Realtime',
          to: { name: 'admin.realtime' },
          icon: 'fas fa-tower-broadcast',
        },
        {
          hide: !user.value.permissions?.includes('manage-configuration'),
          name: 'Sounds',
          to: { name: 'admin.sounds' },
          icon: 'fas fa-music',
        },
      ].filter((e) => !e.hide),
    },
    {
      name: 'explore',
      separator: true,
      list: [
        {
          name: 'FAQ',
          to: 'faq',
          icon: 'quiz',
        },
        {
          name: 'Help And Support',
          href: 'https://discord.gg/u7fQdqQt8c',
          icon: 'error',
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
          icon: 'login',
        },
        {
          hide: !user.value.id,
          name: 'Logout',
          to: { name: 'auth.logout' },
          icon: 'logout',
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
