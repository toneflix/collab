<template>
  <q-page-sticky
    position="bottom-right"
    :offset="$q.screen.lt.sm ? [0, 0] : [20, 16]"
    class="dock-sticky"
    v-if="conversation && !onMessagesPage"
  >
    <transition name="dock" mode="out-in">
      <button
        type="button"
        class="dock-pill"
        key="pill"
        :aria-label="`Open conversation: ${title}`"
        v-if="store.dock.minimized"
        @click="store.toggleMinimized()"
      >
        <img class="cover cover--sm" :src="subject?.imageUrl || conversation.imageUrl || imageFallback" alt="" />
        <span class="dock-pill__title">{{ title }}</span>
        <q-badge rounded color="red-6" :label="unread" v-if="unread" />
        <q-icon name="expand_less" size="20px" class="!flex-none" />
      </button>

      <section
        class="dock"
        :class="{ 'dock--mobile': $q.screen.lt.sm }"
        key="window"
        role="dialog"
        aria-modal="false"
        :aria-label="`Conversation: ${title}`"
        v-else
      >
        <header class="dock__head">
          <img class="cover" :src="subject?.imageUrl || conversation.imageUrl || imageFallback" alt="" />
          <button type="button" class="dock__title" @click="store.toggleMinimized()">
            <span class="dock__title-main">{{ title }}</span>
            <span class="dock__title-sub" v-if="subtitle">{{ subtitle }}</span>
          </button>
          <div class="dock__buttons">
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="open_in_full"
              aria-label="Open full page"
              :to="{ name: 'messages', params: { type: conversation.type, id: conversation.id } }"
            >
              <q-tooltip>Open full page</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="sm" icon="remove" aria-label="Minimize" @click="store.toggleMinimized()">
              <q-tooltip>Minimize</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="sm" icon="close" aria-label="Close" @click="store.closeDock()">
              <q-tooltip>Close</q-tooltip>
            </q-btn>
          </div>
        </header>

        <ConversationThread
          compact
          class="dock__thread"
          ref="thread"
          :type="conversation.type"
          :id="conversation.id"
          :active="!store.dock.minimized"
          :can-delete-any="subject?.canDeleteAny"
          :subject="subject"
        />
      </section>
    </transition>
  </q-page-sticky>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import ConversationThread from './ConversationThread.vue';
import { conversationKey, useConversationStore } from 'src/stores/conversation-store';
import { imageFallback } from 'src/utils/imageFallback';
import { loadConversationRequest, type Conversation } from 'src/utils/requests/conversations';

/**
 * The chat window that sits in the bottom-right corner, like a support chat.
 * It doesn't block the page, so people can keep working in the DAW while
 * they talk. Expand opens the full Messages page.
 */
const $q = useQuasar();
const route = useRoute();
const store = useConversationStore();

const thread = ref<InstanceType<typeof ConversationThread>>();
const subject = ref<Conversation | null>(null);

const conversation = computed(() => store.dock.conversation);
const onMessagesPage = computed(() => route.name === 'messages');
const title = computed(() => subject.value?.title || conversation.value?.title || 'Conversation');
const subtitle = computed(() => subject.value?.subtitle ?? conversation.value?.subtitle);
const unread = computed(() => (conversation.value ? store.find(conversationKey(conversation.value))?.unread ?? 0 : 0));

watch(
  () => (conversation.value ? conversationKey(conversation.value) : null),
  async (key) => {
    subject.value = key ? store.find(key) ?? null : null;
    if (!conversation.value) return;
    void nextTick(() => thread.value?.focus());
    try {
      const data = await loadConversationRequest(conversation.value.type, conversation.value.id).send();
      if (key === (conversation.value && conversationKey(conversation.value))) {
        subject.value = { ...data, unread: subject.value?.unread ?? 0 };
        store.ensure(subject.value);
      }
    } catch {
      // The header falls back to what the opener passed.
    }
  },
  { immediate: true },
);

watch(
  () => store.dock.minimized,
  (minimized) => !minimized && void nextTick(() => thread.value?.focus()),
);
</script>

<style lang="scss" scoped>
.cover {
  flex: none;
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 8px;
  background: #2b2f38;

  &--sm {
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
}

.dock-sticky {
  z-index: 2100;
}

.dock {
  display: flex;
  flex-direction: column;
  width: 380px;
  height: min(580px, calc(100vh - 180px));
  min-height: 320px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.55),
    0 2px 8px rgba(0, 0, 0, 0.4);

  &--mobile {
    width: 100vw;
    height: 100dvh;
    min-height: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex: none;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, #1d2027, #181a20);
  }

  &__title {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    text-align: left;
  }

  &__title-main {
    overflow: hidden;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.25;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__title-sub {
    overflow: hidden;
    font-size: 12px;
    line-height: 1.3;
    color: #9aa0aa;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__buttons {
    display: flex;
    flex: none;
    flex-wrap: nowrap;
    gap: 2px;
    color: #c7cbd2;
  }

  &__thread {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.dock-pill {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  max-width: 320px;
  padding: 8px 12px 8px 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: #1d2027;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
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
}

.dock-enter-active,
.dock-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
