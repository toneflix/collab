<template>
  <q-layout view="lHh Lpr fFf">
    <!-- lHh Lpr lff -->
    <q-header class="text-white bg-dark">
      <q-toolbar>
        <q-btn
          flat
          round
          class="!flex-none mr-2"
          :aria-label="leftDrawerOpen ? 'Close menu' : 'Open menu'"
          @click="leftDrawerOpen = !leftDrawerOpen"
          v-if="overlay"
        >
          <t-icon name="eva-menu" />
        </q-btn>

        <VaButton
          round
          size="medium"
          color="backgroundSecondary"
          v-if="!showSearch"
          @click="showSearch = !showSearch"
        >
          <t-icon name="eva-search" />
        </VaButton>

        <VaInput
          placeholder="Search songs, lyrics and creators"
          aria-label="Search"
          v-model="searchText"
          @keyup.enter="search"
          preset="solid"
          color="textPrimary"
          class="placeholder-white"
          background="backgroundSecondary"
          style="
            --va-input-wrapper-border-radius: 20px;
            --va-input-wrapper-color: #fff;
            --va-input-wrapper-border-color: var(--va-background-secondary);
          "
          v-if="showSearch"
        >
          <template #prependInner>
            <q-icon
              name="clear"
              size="sm"
              color="white"
              v-if="$q.screen.lt.sm"
              @click="showSearch = !showSearch"
            />
          </template>
        </VaInput>
        <!-- <q-toolbar-title class="text-center"> Title </q-toolbar-title> -->

        <q-space />

        <q-btn
          flat
          round
          class="!flex-none mr-2"
          aria-label="Messages"
          :to="{ name: 'messages' }"
          v-if="boot.user?.id"
        >
          <t-icon name="eva-message-circle" />
          <q-badge floating rounded color="red-6" :label="unreadLabel" v-if="conversations.unread" />
          <q-tooltip>Messages</q-tooltip>
        </q-btn>

        <NotificationBell v-if="boot.user?.id" />

        <div>
          <ProfileDropdown>
            <template #anchor="{ isShown }">
              <q-chip
                clickable
                color="grey-9"
                text-color="white"
                :icon-right="`eva-chevron-${isShown ? 'up' : 'down'}-outline`"
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
      v-model="leftDrawerOpen"
    >
      <q-toolbar
        class="!items-start !flex-nowrap py-3 mb-10 h-28 bg-dark absolute-top"
        :class="{ '!justify-center !px-0': collapsed }"
      >
        <div class="!flex-none" v-if="!collapsed">
          <img src="~/assets/logo.png" class="h-10 cursor-pointer" />
        </div>
        <q-space v-if="!collapsed" />
        <q-btn
          flat
          round
          dense
          class="!flex-none mt-1"
          :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
          @click="toggleSidebar"
          v-if="!overlay"
        >
          <t-icon :name="collapsed ? 'eva-chevron-right' : 'eva-chevron-left'" />
          <q-tooltip anchor="center right" self="center left">{{ collapsed ? 'Expand menu' : 'Collapse menu' }}</q-tooltip>
        </q-btn>
      </q-toolbar>

      <q-scroll-area class="mt-28" :class="adminMenu ? 'h-[calc(100%-169px)]' : 'h-[calc(100%-112px)]'">
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
            <q-tooltip anchor="center right" self="center left" v-if="collapsed">{{ link.title }}</q-tooltip>
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
                <t-icon :name="link.icon" />
              </q-item-section>

              <q-item-section> {{ link.title }} </q-item-section>
              <q-item-section side v-if="!collapsed && link.badge === 'messages' && conversations.unread">
                <q-badge rounded color="red-6" :label="unreadLabel" />
              </q-item-section>
              <q-tooltip anchor="center right" self="center left" v-if="collapsed">{{ link.title }}</q-tooltip>
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
                  {{ link.title }}
                </q-item-section>
                <q-item-section side v-if="link.button">
                  <q-btn dense outline size="sm" :to="link.button.action">
                    <t-icon :name="link.button.icon" />
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
                  <t-icon name="eva-file" />
                </q-item-section>

                <q-item-section> {{ item.title }} </q-item-section>
                <q-tooltip anchor="center right" self="center left" v-if="collapsed">{{ item.title }}</q-tooltip>
              </q-item>
            </template>
          </template>
        </q-list>
      </q-scroll-area>

      <div class="absolute-bottom bg-dark" v-if="adminMenu">
        <q-separator />
        <q-list padding class="menu-list">
          <q-item dense exact clickable v-ripple :to="{ name: 'home' }">
            <q-item-section avatar>
              <t-icon name="eva-arrow-back" />
            </q-item-section>
            <q-item-section>Back to app</q-item-section>
            <q-tooltip anchor="center right" self="center left" v-if="collapsed">Back to app</q-tooltip>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
      <ConversationDock v-if="boot.user?.id" />
    </q-page-container>

    <q-footer class="text-white bg-glass">
      <AudioPlayer v-if="!$route.meta.hidePlayer" />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { LocalStorage, useQuasar } from 'quasar';
import AudioPlayer from 'src/components/Controllers/AudioPlayer.vue';
import ProfileDropdown from 'src/components/dropdowns/ProfileDropdown.vue';
import TIcon from 'src/components/icons/TIcon.vue';
import ConversationDock from 'src/components/Conversation/ConversationDock.vue';
import NotificationBell from 'src/components/Notifications/NotificationBell.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { conversationKey, useConversationStore } from 'src/stores/conversation-store';
import { useNotificationStore } from 'src/stores/notification-store';
import type { AppNotification } from 'src/utils/requests/notifications';
import { useRealtimeChannel } from 'src/utils/realtime';
import type { ChatMessage, Conversation } from 'src/utils/requests/conversations';
import { allowedAdminLinks, mainNavigationLinks } from 'src/utils/navigations';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { reboot } from 'src/utils/proccessor';
import { GenericData, ResponseBody } from 'src/utils/models';
import { alova } from 'src/boot/alova';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);

    await reboot().then(({ init }) => {
      boot.configuration = init.configuration;
    });

    const data = {} as Record<string, GenericData>;
    const groups = mainNavigationLinks.filter((e) => !!e.group && (!e.requiresAuth || boot.user?.id));

    for (const group of groups) {
      if (group.group) {
        data[group.group] = await alova
          .Get(group.group, {
            params: group.params,
            transform: (e: ResponseBody<GenericData>) => e.data,
          })
          .send();
      }
    }

    boot.setCache({ mainLayoutGroups: data } as unknown as GenericData);
  },
});

const $q = useQuasar();
const boot = useBootstrapStore();
const showSearch = ref($q.screen.gt.xs);
const searchText = ref('');
const leftDrawerOpen = ref(false);

/** Below this width the menu slides over the page instead of sitting beside it. */
const drawerBreakpoint = 500;
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

const search = () => {
  const q = searchText.value.trim();
  if (q) void router.push({ name: 'search', query: { q } });
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
const unreadLabel = computed(() => (conversations.unread > 99 ? '99+' : conversations.unread));

const notifications = useNotificationStore();

/** Admin pages swap the menu for the admin links. */
const adminMenu = computed(() => route.meta.adminMenu === true);
const adminLinks = computed(() => [
  { to: { name: 'admin' }, icon: 'fas fa-gauge', title: 'Overview', exact: true },
  ...allowedAdminLinks(boot.user?.permissions).map((link) => ({ ...link, exact: false })),
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
  'conversation.posted': ({ conversation, message }: { conversation: Conversation; message: ChatMessage }) => {
    const key = conversation.key || conversationKey(conversation);
    const onScreen = conversations.visible.includes(key);
    conversations.receive(conversation, message);
    // The corner window already shows its own unread count.
    const inDock = conversations.dock.conversation && conversationKey(conversations.dock.conversation) === key;
    if (onScreen || inDock || !message) return;

    $q.notify({
      group: key,
      color: 'grey-10',
      textColor: 'white',
      position: 'top-right',
      avatar: message.user?.imageUrl || undefined,
      message: `${message.user?.name || 'Someone'} · ${conversation.title}`,
      caption: message.body.length > 90 ? `${message.body.slice(0, 90)}…` : message.body,
      actions: [
        {
          label: 'Reply',
          color: 'light-blue-4',
          noCaps: true,
          handler: () => {
            if (route.name === 'messages' || $q.screen.lt.sm) {
              void router.push({ name: 'messages', params: { type: conversation.type, id: conversation.id } });
            } else conversations.openDock(conversation);
          },
        },
      ],
    });
  },
  'conversation.deleted': () => conversations.removed(),
  'notification.created': ({ notification }: { notification: AppNotification }) => notifications.receive(notification),
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
