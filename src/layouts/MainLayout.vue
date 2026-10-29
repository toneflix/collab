<template>
  <q-layout view="lHh Lpr fFf">
    <!-- lHh Lpr lff -->
    <q-header
      class="text-white bg-dark"
      :class="{ 'header--wide': isSearchRoute }"
    >
      <q-toolbar>
        <q-btn
          flat
          round
          class="flex-none! mr-2"
          :aria-label="leftDrawerOpen ? 'Close menu' : 'Open menu'"
          @click="leftDrawerOpen = !leftDrawerOpen"
          v-if="overlay && adminMenu"
        >
          <q-icon name="lucide-menu" />
        </q-btn>

        <router-link
          class="flex-none! sm:hidden!"
          aria-label="Home"
          :to="{ name: 'home' }"
          v-if="!isSearchRoute"
        >
          <AppLogo :size="28" />
        </router-link>

        <q-btn
          flat
          round
          class="flex-none! bg-surface-2 max-sm:hidden!"
          aria-label="Search"
          v-if="!showSearch && !isSearchRoute"
          @click="showSearch = !showSearch"
        >
          <q-icon name="lucide-search" />
        </q-btn>

        <q-input
          dense
          outlined
          rounded
          placeholder="Search songs, lyrics and creators"
          aria-label="Search"
          class="header-search"
          :class="{ 'max-sm:hidden!': !isSearchRoute }"
          v-model="searchText"
          @keyup.enter="search"
          v-if="showSearch || isSearchRoute"
        >
          <template #prepend>
            <q-icon
              name="lucide-x"
              size="xs"
              class="cursor-pointer"
              v-if="$q.screen.lt.sm"
              @click="closeSearch"
            />
            <q-icon name="lucide-search" v-else />
          </template>
        </q-input>
        <!-- <q-toolbar-title class="text-center"> Title </q-toolbar-title> -->

        <q-space />

        <!-- Phones search from the Explore tab, which keeps the header clear of the camera -->
        <q-btn
          flat
          round
          class="flex-none! sm:mr-2"
          :class="{ 'max-sm:hidden!': isSearchRoute }"
          aria-label="Messages"
          :to="{ name: 'messages' }"
          v-if="boot.user?.id"
        >
          <q-icon name="lucide-message-circle" size="19px" />
          <q-badge
            floating
            rounded
            color="red-6"
            :label="unreadLabel"
            v-if="conversations.unread"
          />
          <q-tooltip>Messages</q-tooltip>
        </q-btn>

        <NotificationBell
          :class="{ 'max-sm:hidden!': isSearchRoute }"
          v-if="boot.user?.id"
        />

        <div :class="{ 'max-sm:hidden!': isSearchRoute }">
          <ProfileDropdown>
            <template #anchor="{ isShown }">
              <q-chip
                clickable
                color="grey-9"
                text-color="white"
                :icon-right="
                  isShown ? 'lucide-chevron-up' : 'lucide-chevron-down'
                "
              >
                <q-avatar size="sm">
                  <img
                    :src="
                      boot.user.imageUrl ||
                      'https://cdn.quasar.dev/img/boy-avatar.png'
                    "
                  />
                </q-avatar>
                <div class="ellipsis" v-if="$q.screen.gt.xs">
                  {{ boot.user.name || 'Guest' }}
                </div>
              </q-chip>
            </template>
          </ProfileDropdown>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      show-if-above
      side="left"
      :breakpoint="drawerBreakpoint"
      :mini="collapsed"
      :mini-width="64"
      :no-swipe-open="!adminMenu"
      v-model="leftDrawerOpen"
    >
      <q-toolbar
        class="items-start! flex-nowrap! py-4 mb-10 h-28 bg-dark absolute-top"
        :class="{ 'justify-center! px-0!': collapsed }"
      >
        <div class="flex-none!" v-if="!collapsed">
          <AppLogo :size="34" class="cursor-pointer" />
        </div>
        <q-space v-if="!collapsed" />
        <q-btn
          flat
          round
          dense
          class="flex-none! mt-1"
          :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
          @click="toggleSidebar"
          v-if="!overlay"
        >
          <q-icon
            :name="collapsed ? 'lucide-chevron-right' : 'lucide-chevron-left'"
          />
          <q-tooltip anchor="center right" self="center left">{{
            collapsed ? 'Expand menu' : 'Collapse menu'
          }}</q-tooltip>
        </q-btn>
      </q-toolbar>

      <q-scroll-area
        class="mt-28"
        :class="adminMenu ? 'h-[calc(100%-169px)]' : 'h-[calc(100%-112px)]'"
      >
        <q-list padding class="menu-list" v-if="adminMenu">
          <q-item dense class="label" v-if="!collapsed">
            <q-item-section class="text-gray-400">Admin</q-item-section>
          </q-item>

          <q-item
            dense
            clickable
            v-ripple
            :exact="link.exact"
            :to="link.to"
            :key="link.title"
            v-for="link in adminLinks"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" size="18px" />
            </q-item-section>
            <q-item-section>{{ link.title }}</q-item-section>
            <q-tooltip
              anchor="center right"
              self="center left"
              v-if="collapsed"
              >{{ link.title }}</q-tooltip
            >
          </q-item>
        </q-list>

        <q-list padding class="menu-list" v-else>
          <template v-for="link in mainNavigationLinks">
            <q-item
              dense
              exact
              clickable
              v-ripple
              :to="link.to"
              :key="link.title"
              v-if="
                !link.group &&
                !link.separator &&
                (!link.requiresAuth || boot.user?.id)
              "
            >
              <q-item-section avatar>
                <q-icon :name="link.icon" />
              </q-item-section>

              <q-item-section> {{ link.title }} </q-item-section>
              <q-item-section
                side
                v-if="
                  !collapsed &&
                  link.badge === 'messages' &&
                  conversations.unread
                "
              >
                <q-badge rounded color="red-6" :label="unreadLabel" />
              </q-item-section>
              <q-tooltip
                anchor="center right"
                self="center left"
                v-if="collapsed"
                >{{ link.title }}</q-tooltip
              >
            </q-item>

            <q-separator
              class="q-my-lg"
              :key="link.title"
              v-if="link.separator"
            />

            <template
              v-if="link.group && (!link.requiresAuth || boot.user?.id)"
            >
              <q-item dense class="label" :key="link.group" v-if="!collapsed">
                <q-item-section class="text-gray-400">
                  <router-link
                    v-if="link.to"
                    :to="link.to"
                    class="label-link"
                  >
                    {{ link.title }}
                  </router-link>
                  <template v-else>{{ link.title }}</template>
                </q-item-section>
                <q-item-section side v-if="link.button">
                  <q-btn dense outline size="sm" :to="link.button.action">
                    <q-icon :name="link.button.icon" />
                  </q-btn>
                </q-item-section>
              </q-item>

              <q-item
                dense
                clickable
                v-ripple
                :to="routeBuilder(item, link.group)"
                :key="link.group + item.title"
                v-for="item in cache.mainLayoutGroups[link.group]"
              >
                <q-item-section avatar>
                  <q-icon name="lucide-file" />
                </q-item-section>

                <q-item-section> {{ item.title }} </q-item-section>
                <q-tooltip
                  anchor="center right"
                  self="center left"
                  v-if="collapsed"
                  >{{ item.title }}</q-tooltip
                >
              </q-item>
            </template>
          </template>
        </q-list>
      </q-scroll-area>

      <div class="absolute-bottom bg-dark" v-if="adminMenu">
        <q-separator />
        <q-list padding class="menu-list">
          <q-item
            dense
            clickable
            v-ripple
            :href="docsUrl"
            target="_blank"
            rel="noopener"
            v-if="docsUrl"
          >
            <q-item-section avatar>
              <q-icon name="lucide-book-open" />
            </q-item-section>
            <q-item-section>Setup docs</q-item-section>
            <q-tooltip anchor="center right" self="center left" v-if="collapsed"
              >Setup docs</q-tooltip
            >
          </q-item>
          <q-item dense exact clickable v-ripple :to="{ name: 'home' }">
            <q-item-section avatar>
              <q-icon name="lucide-arrow-left" />
            </q-item-section>
            <q-item-section>Back to app</q-item-section>
            <q-tooltip anchor="center right" self="center left" v-if="collapsed"
              >Back to app</q-tooltip
            >
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component, route: view }">
        <component :is="Component" :key="pageKey(view)" />
      </router-view>
      <ConversationDock v-if="boot.user?.id" />
    </q-page-container>

    <q-footer class="text-white bg-glass">
      <!-- On phones the player bar only shows once something is queued -->
      <AudioPlayer
        :class="{ 'max-sm:hidden!': !hasTrack }"
        v-if="!$route.meta.hidePlayer"
      />
      <!-- Phones get tabs instead of the side menu -->
      <BottomNav v-if="!adminMenu && !$route.meta.hideTabs" />
    </q-footer>

    <TrackMenuHost />
  </q-layout>
</template>

<script setup lang="ts">
import { LocalStorage, useQuasar } from 'quasar';
import AudioPlayer from 'src/components/Controllers/AudioPlayer.vue';
import BottomNav from 'src/components/Controllers/BottomNav.vue';
import TrackMenuHost from 'src/components/Tracks/TrackMenuHost.vue';
import ProfileDropdown from 'src/components/dropdowns/ProfileDropdown.vue';
import ConversationDock from 'src/components/Conversation/ConversationDock.vue';
import NotificationBell from 'src/components/Notifications/NotificationBell.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute, useRouter } from 'vue-router';
import {
  conversationKey,
  useConversationStore,
} from 'src/stores/conversation-store';
import { useNotificationStore } from 'src/stores/notification-store';
import { usePlayerStore } from 'src/stores/player-store';
import type { AppNotification } from 'src/utils/requests/notifications';
import { useRealtimeChannel } from 'src/utils/realtime';
import type {
  ChatMessage,
  Conversation,
} from 'src/utils/requests/conversations';
import { allowedAdminLinks, mainNavigationLinks } from 'src/utils/navigations';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { reboot } from 'src/utils/proccessor';
import { GenericData, ResponseBody } from 'src/utils/models';
import { alova } from 'src/boot/alova';
import { docsUrl } from 'src/utils/env';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const loaded = boot.pageData.cache as unknown as {
      mainLayoutUser?: number | null;
    };
    const userId = boot.user?.id ?? null;

    // Pages with route params run this again on each visit; in the browser the
    // settings and menu only need loading again when the signed-in account changes.
    if (
      !import.meta.env.SSR &&
      boot.ready &&
      loaded.mainLayoutUser === userId
    ) {
      return;
    }

    await reboot().then(({ init }) => {
      boot.configuration = init.configuration;
    });

    const data = {} as Record<string, GenericData>;
    const groups = mainNavigationLinks.filter(
      (e) => !!e.group && (!e.requiresAuth || boot.user?.id),
    );

    await Promise.all(
      groups.map(async ({ group, params }) => {
        if (group) {
          data[group] = await alova
            .Get(group, {
              params,
              transform: (e: ResponseBody<GenericData>) => e.data,
            })
            .send();
        }
      }),
    );

    boot.setCache({
      mainLayoutGroups: data,
      mainLayoutUser: boot.user?.id ?? null,
    } as unknown as GenericData);
  },
});

const $q = useQuasar();
const boot = useBootstrapStore();
const showSearch = ref($q.screen.gt.xs);
const searchText = ref('');
const leftDrawerOpen = ref(false);

/** Below this width (Tailwind's sm) phones use the bottom tabs and the menu is hidden. */
const drawerBreakpoint = 640;
const sidebarKey = 'layout.sidebar.mini';
/** The collapsed state people chose for pages that don't set their own. */
const preferMini = ref(false);
const mini = ref(false);
const overlay = computed(() => $q.screen.width < drawerBreakpoint);
/** Whether the menu shows icons only. */
const collapsed = computed(() => mini.value && !overlay.value);
const cache = boot.pageData.cache as unknown as {
  mainLayoutGroups: Record<string, GenericData[]>;
};

const route = useRoute();
const router = useRouter();

/**
 * Remounts the page when its route params change, so a page opened for another
 * track, album or artist starts from that one's prefetched data. Routes with
 * `meta.keepOnParamChange` update in place instead.
 */
const pageKey = (view: RouteLocationNormalizedLoaded) =>
  view.meta.keepOnParamChange ? '' : JSON.stringify(view.params);

const isSearchRoute = computed(() => route.name === 'search');

/** History position of the search page when it was opened from another page. */
let searchStart: number | null = null;
const stopTrackingSearch = router.afterEach((to, from) => {
  if (
    typeof window !== 'undefined' &&
    to.name === 'search' &&
    from.name !== 'search'
  ) {
    const position = window.history.state?.position;
    searchStart = typeof position === 'number' ? position : null;
  }
});
onBeforeUnmount(stopTrackingSearch);

/** Leaves search for the page it was opened from, past every query typed since. */
const closeSearch = () => {
  if (!isSearchRoute.value) {
    showSearch.value = false;
    return;
  }

  const position = window.history.state?.position;
  if (searchStart && typeof position === 'number') {
    router.go(searchStart - 1 - position);
  } else {
    void router.push({ name: 'home' });
  }
};

const player = usePlayerStore();
const mounted = ref(false);
/** The queue lives in the browser, so it is only known after mounting. */
const hasTrack = computed(() => mounted.value && !!player.current?.id);

const search = () => {
  const q = searchText.value.trim();
  if (!q) return;
  if (route.name === 'search') {
    // Another query on the search page keeps its filters and replaces the last
    // one, so back and close don't step through every query
    void router.replace({ name: 'search', query: { ...route.query, q } });
  } else {
    void router.push({ name: 'search', query: { q } });
  }
};

// Show what was searched for while on the results.
watch(
  () => route.query.q,
  (q) => {
    if (route.name === 'search') searchText.value = String(q ?? '');
  },
  { immediate: true },
);
const conversations = useConversationStore();
const unreadLabel = computed(() =>
  conversations.unread > 99 ? '99+' : conversations.unread,
);

const notifications = useNotificationStore();

/** Admin pages swap the menu for the admin links. */
const adminMenu = computed(() => route.meta.adminMenu === true);
const adminLinks = computed(() => [
  {
    to: { name: 'admin' },
    icon: 'lucide-gauge',
    title: 'Overview',
    exact: true,
  },
  ...allowedAdminLinks(boot.user?.permissions).map((link) => ({
    ...link,
    exact: false,
  })),
]);

// Pages like the DAW start with the menu collapsed to make room; others use the saved choice.
watch(
  () => route.meta.collapseSidebar,
  (collapse) => {
    mini.value = collapse === true || preferMini.value;
  },
  { immediate: true },
);

onMounted(() => {
  mounted.value = true;
  preferMini.value = LocalStorage.getItem<boolean>(sidebarKey) === true;
  mini.value = route.meta.collapseSidebar === true || preferMini.value;
});

const toggleSidebar = () => {
  mini.value = !mini.value;

  if (!route.meta.collapseSidebar) {
    preferMini.value = mini.value;
    LocalStorage.set(sidebarKey, mini.value);
  }
};

// Conversations and notifications follow whoever is signed in.
watch(
  () => boot.user?.id,
  (id) => {
    conversations.reset();
    notifications.reset();
    if (id) {
      void conversations.load();
      void notifications.load();
    }
  },
  { immediate: true },
);

/** New messages anywhere the user takes part, for the unread counts and a nudge. */
useRealtimeChannel(() => (boot.user?.id ? `user.${boot.user.id}` : null), {
  'conversation.posted': ({
    conversation,
    message,
  }: {
    conversation: Conversation;
    message: ChatMessage;
  }) => {
    const key = conversation.key || conversationKey(conversation);
    const onScreen = conversations.visible.includes(key);
    conversations.receive(conversation, message);
    // The corner window already shows its own unread count.
    const inDock =
      conversations.dock.conversation &&
      conversationKey(conversations.dock.conversation) === key;
    if (onScreen || inDock || !message) return;

    $q.notify({
      group: key,
      color: 'grey-10',
      textColor: 'white',
      position: 'top-right',
      avatar: message.user?.imageUrl || undefined,
      message: `${message.user?.name || 'Someone'} · ${conversation.title}`,
      caption:
        message.body.length > 90
          ? `${message.body.slice(0, 90)}…`
          : message.body,
      actions: [
        {
          label: 'Reply',
          color: 'light-blue-4',
          noCaps: true,
          handler: () => {
            if (route.name === 'messages' || $q.screen.lt.sm) {
              void router.push({
                name: 'messages',
                params: { type: conversation.type, id: conversation.id },
              });
            } else conversations.openDock(conversation);
          },
        },
      ],
    });
  },
  'conversation.deleted': () => conversations.removed(),
  'notification.created': ({
    notification,
  }: {
    notification: AppNotification;
  }) => notifications.receive(notification),
});

const routeBuilder = (item: GenericData, group: string) => {
  if (group === 'creator/projects') {
    return {
      name: 'studio.project',
      params: { project_id: item.slug },
    };
  }
  return null;
};
</script>
