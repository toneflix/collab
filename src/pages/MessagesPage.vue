<template>
  <q-page class="messages" :style-fn="fill">
    <aside class="inbox" v-if="!narrow || !current">
      <div class="inbox__head">
        <h1 class="inbox__title">Messages</h1>
        <q-badge rounded color="red-6" :label="store.unread" v-if="store.unread" />
      </div>
      <div class="inbox__search">
        <q-icon name="lucide-search" size="18px" color="grey-6" class="flex-none!" />
        <input type="search" placeholder="Search conversations" aria-label="Search conversations" v-model="search" />
      </div>

      <div class="inbox__list" role="list">
        <ListSkeleton dense :rows="6" v-if="!store.loaded && store.loading" />
        <div class="inbox__empty" v-else-if="!filtered.length">
          <q-icon name="lucide-messages-square" size="36px" color="grey-7" />
          <div class="mt-2 text-sm text-grey-5">
            {{
              search
                ? 'No conversations match.'
                : 'No conversations yet. Open a project track and start one from the Conversation button.'
            }}
          </div>
        </div>

        <router-link
          role="listitem"
          class="convo"
          :class="{ 'convo--active': current === item.key, 'convo--unread': item.unread }"
          :key="item.key"
          :to="{ name: 'messages', params: { type: item.type, id: item.id } }"
          v-for="item in filtered"
        >
          <img class="convo__image" :src="item.imageUrl || imageFallback" alt="" />
          <span class="convo__text">
            <span class="convo__row">
              <span class="convo__title">{{ item.title }}</span>
              <span class="convo__time" v-if="item.updatedAt">{{ ago(item.updatedAt) }}</span>
            </span>
            <span class="convo__row">
              <span class="convo__preview">
                <template v-if="item.lastMessage">
                  <b v-if="isMine(item)">You: </b>
                  <b v-else-if="item.lastMessage.user">{{ firstName(item.lastMessage.user.name) }}: </b>
                  {{ item.lastMessage.body }}
                </template>
                <template v-else>{{ item.subtitle || 'No messages yet' }}</template>
              </span>
              <span class="convo__badge" v-if="item.unread">{{ item.unread > 99 ? '99+' : item.unread }}</span>
            </span>
          </span>
        </router-link>
      </div>
    </aside>

    <section class="chat" v-if="!narrow || current">
      <template v-if="current && params">
        <header class="chat__head">
          <IconBtn
            icon="lucide-arrow-left"
            aria-label="All conversations"
            class="flex-none!"
            :to="{ name: 'messages' }"
            v-if="narrow"
          />
          <img class="chat__image" :src="subject?.imageUrl || imageFallback" alt="" />
          <div class="chat__title">
            <div class="chat__title-main">{{ subject?.title || 'Conversation' }}</div>
            <div class="chat__title-sub" v-if="subject?.subtitle">{{ subject.subtitle }}</div>
          </div>
          <q-btn
            outline
            rounded
            no-caps
            size="sm"
            color="grey-4"
            class="flex-none!"
            icon-right="lucide-arrow-up-right"
            :label="narrow ? 'Open' : `Open ${noun}`"
            :to="link"
            v-if="link"
          />
        </header>
        <ConversationThread
          class="chat__thread"
          :type="params.type"
          :id="params.id"
          :active="true"
          :can-delete-any="subject?.canDeleteAny"
          :subject="subject"
        />
      </template>

      <div class="chat__empty" v-else>
        <q-icon name="lucide-message-circle" size="48px" color="grey-7" />
        <div class="mt-4 text-lg font-bold">Your conversations</div>
        <div class="text-sm text-grey-5">Pick one on the left to read and reply.</div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { date, useQuasar } from 'quasar';
import ConversationThread from 'src/components/Conversation/ConversationThread.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { conversationKey, conversationLink, useConversationStore } from 'src/stores/conversation-store';
import { imageFallback } from 'src/utils/imageFallback';
import {
  loadConversationRequest,
  type Conversation,
  type ConversationType,
} from 'src/utils/requests/conversations';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const $q = useQuasar();
const route = useRoute();
const boot = useBootstrapStore();
const store = useConversationStore();

const search = ref('');
const loaded = ref<Conversation | null>(null);

const narrow = computed(() => $q.screen.lt.md);

const params = computed(() => {
  const { type, id } = route.params as { type?: string; id?: string };
  return type && id ? { type: type as ConversationType, id } : null;
});

const current = computed(() => (params.value ? conversationKey(params.value) : null));
const subject = computed(() => (current.value ? store.find(current.value) ?? loaded.value : null));
const link = computed(() => (subject.value ? conversationLink(subject.value) : null));
const noun = computed(
  () => ({ 'project-track': 'track', project: 'project', track: 'track', release: 'album' })[params.value?.type ?? 'project'],
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return store.list;
  return store.list.filter((c) =>
    [c.title, c.subtitle, c.lastMessage?.body, c.lastMessage?.user?.name].some((v) => v?.toLowerCase().includes(q)),
  );
});

/** The page fills the space between the header and the player. */
const fill = (offset: number) => ({ height: offset ? `calc(100vh - ${offset}px)` : '100vh' });

const isMine = (c: Conversation) => String(c.lastMessage?.user?.id ?? '') === String(boot.user?.id ?? '');
const firstName = (name?: string) => (name || '').split(' ')[0];

/** Short times for the list: "now", "5m", "3h", "Yesterday", "Tue", "Mar 4". */
const ago = (value: string) => {
  const d = new Date(value);
  const seconds = (Date.now() - d.getTime()) / 1000;
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `${Math.floor(seconds / 3600)}h`;
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return 'Yesterday';
  if (seconds < 6 * 864e2) return date.formatDate(d, 'ddd');
  return date.formatDate(d, d.getFullYear() === today.getFullYear() ? 'MMM D' : 'MMM D, YYYY');
};

/** A conversation opened by link may not be in the list yet. */
watch(
  current,
  async (key) => {
    if (!key || !params.value) return;
    const { type, id } = params.value;
    try {
      const data = await loadConversationRequest(type, id).send();
      if (key !== current.value) return;
      const existing = store.find(key);
      if (existing) existing.canDeleteAny = data.canDeleteAny;
      else {
        loaded.value = data;
        store.ensure({ ...data, unread: 0 });
      }
    } catch {
      // The thread shows its own error.
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!store.loaded) void store.load();
  // The page replaces the corner window for this conversation.
  if (store.dock.conversation && current.value === conversationKey(store.dock.conversation)) store.closeDock();
});
</script>

<style lang="scss" scoped>
.messages {
  display: flex;
  flex-wrap: nowrap;
  min-height: 0 !important;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.inbox {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 340px;
  min-height: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #121418;

  @media (max-width: 1023px) {
    width: 100%;
    border-right: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    padding: 18px 16px 10px;
  }

  &__title {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.2;
  }

  &__search {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin: 0 12px 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #1d2027;

    input {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 14px;
      color: inherit;
      background: transparent;
      outline: none;
    }
  }

  &__list {
    flex: 1 1 auto;
    min-height: 0;
    padding: 4px 8px 12px;
    overflow-y: auto;
  }

  &__status,
  &__empty {
    padding: 32px 16px;
    text-align: center;
  }
}

.convo {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 10px;
  color: inherit;
  text-decoration: none;
  border-radius: 12px;
  transition: background-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &--active,
  &--active:hover {
    background: rgba(3, 191, 255, 0.12);
  }

  &__image {
    flex: none;
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 10px;
    background: #2b2f38;
  }

  &__text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__time {
    flex: none;
    font-size: 12px;
    color: #8a909e;
  }

  &__preview {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    color: #9aa0aa;
    white-space: nowrap;
    text-overflow: ellipsis;

    b {
      font-weight: 600;
    }
  }

  &__badge {
    flex: none;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    line-height: 20px;
    text-align: center;
    color: #fff;
    border-radius: 999px;
    background: #03a9e6;
  }

  &--unread {
    .convo__title {
      font-weight: 800;
    }

    .convo__preview {
      color: #e6e8eb;
    }

    .convo__time {
      color: #03bfff;
    }
  }
}

.chat {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #15171c;

  &__head {
    display: flex;
    flex: none;
    flex-wrap: nowrap;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__image {
    flex: none;
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 8px;
    background: #2b2f38;
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__title-main {
    overflow: hidden;
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__title-sub {
    overflow: hidden;
    font-size: 13px;
    color: #9aa0aa;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__thread {
    flex: 1 1 auto;
    min-height: 0;
  }

  &__empty {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
  }
}
</style>
