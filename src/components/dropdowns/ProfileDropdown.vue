<template>
  <div class="profile-dropdown-wrapper">
    <!-- The avatar and the menu: a dropdown on wider screens, a centred dialog on phones -->
    <DefineLabel>
      <q-avatar clickable color="white" size="25px" v-if="user.id">
        <img :src="user.imageUrl" />
      </q-avatar>
      <q-icon class="rounded-full bg-grey" v-else name="lucide-user" />
      <span class="ml-2 mr-6 max-sm:hidden!">{{ user.fullname || 'Guest' }}</span>
      <q-icon
        name="lucide-crown"
        color="amber-7"
        size="12px"
        class="-ml-5 mr-8 max-sm:hidden!"
        v-if="user.badge"
      />
    </DefineLabel>
    <DefineMenu>
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
                :disable="switching && !!link.click"
                :key="i + group.name"
                @click="link.click?.()"
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
    </DefineMenu>

    <q-btn-dropdown
      dense
      rounded
      no-caps
      color="grey-9"
      class="ml-1 sm:mx-2 header-avatar"
      content-class="user-dropdown-content"
      :menu-offset="[3, 2]"
      v-if="!$q.screen.lt.sm"
    >
      <template v-slot:label>
        <ReuseLabel />
      </template>
      <ReuseMenu />
    </q-btn-dropdown>

    <template v-else>
      <q-btn dense rounded no-caps color="grey-9" class="ml-1 header-avatar" aria-label="Your account" @click="menuOpen = true">
        <ReuseLabel />
      </q-btn>
      <q-dialog v-model="menuOpen">
        <!-- Any choice in the menu closes it -->
        <q-card dark class="user-dropdown-content profile-dialog" @click="menuOpen = false">
          <ReuseMenu />
        </q-card>
      </q-dialog>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { allowedAdminLinks } from 'src/utils/navigations';
import { createReusableTemplate } from '@vueuse/core';
import { computed, ref } from 'vue';
import { RouteLocationRaw, useRouter } from 'vue-router';
import { homeFor } from 'src/utils/auth-redirect';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';

type ProfileListItem = {
  hide?: boolean;
  name: string;
  to?: RouteLocationRaw;
  href?: string;
  icon: string;
  click?: () => void;
};

type ProfileOptions = {
  name: string;
  separator: boolean;
  list: ProfileListItem[];
};

const boot = useBootstrapStore();
const router = useRouter();
const user = computed(() => boot.user);
const switching = ref(false);

/** Flips the account between creator and listener, then opens that type's home page. */
const switchAccountType = async () => {
  if (switching.value) return;

  switching.value = true;

  try {
    await boot.switchAccountType(boot.isListener ? 'creator' : 'listener');

    notify(
      boot.isListener ? 'You are now a listener.' : 'You are now a creator. The studio is open to you.',
      'success',
    );
    await router.push(homeFor(boot.user));
  } catch (e) {
    notifyError(e, 'We could not switch your account type.');
  } finally {
    switching.value = false;
  }
};

const [DefineLabel, ReuseLabel] = createReusableTemplate();
const [DefineMenu, ReuseMenu] = createReusableTemplate();
/** The menu's dialog, on phones */
const menuOpen = ref(false);
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
          hide: boot.isListener,
          name: 'Studio',
          to: { name: 'studio.home' },
          icon: 'lucide-mic',
        },
        {
          name: boot.isListener ? 'Switch to creator' : 'Switch to listener',
          icon: 'lucide-repeat',
          click: switchAccountType,
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
          hide: boot.isListener,
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
          name: 'About',
          to: { name: 'about' },
          icon: 'lucide-info',
        },
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
/* Phones: the menu in a centred dialog, scrolling if the screen is short */
.profile-dialog {
  width: min(92vw, 360px);
  max-height: 85dvh;
  overflow-y: auto;
  background: var(--tf-surface-1);
}

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
