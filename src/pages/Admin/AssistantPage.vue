<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Assistant</h1>
        <p class="text-grey-5">Ask for moderation work in plain words. Changes wait for your confirmation.</p>
      </div>

      <div class="unavailable" v-if="!available">
        <q-icon name="lucide-circle-alert" size="20px" color="amber-6" class="flex-none!" />
        <span>The assistant needs its AI keys set in .env.</span>
        <q-btn flat dense no-caps color="primary" label="AI tools" class="flex-none!" :to="{ name: 'admin.ai' }" />
      </div>

      <div class="assistant">
        <aside class="chats" v-if="!narrow || !chatId">
          <q-btn
            unelevated
            no-caps
            color="primary"
            text-color="dark"
            icon="lucide-plus"
            label="New chat"
            class="flex-none! mx-3 mt-3"
            :to="{ name: 'admin.assistant' }"
          />
          <div class="chats__list" role="list">
            <ListSkeleton dense :avatar="false" :rows="5" v-if="chatsLoading && !chats.length" />
            <div class="chats__empty" v-else-if="!chats.length">No chats yet.</div>
            <router-link
              role="listitem"
              class="chats__item"
              :class="{ 'chats__item--active': chat.id === chatId }"
              :key="chat.id"
              :to="{ name: 'admin.assistant', params: { chat: chat.id } }"
              v-for="chat in chats"
            >
              <span class="chats__title">{{ chat.title || 'Chat' }}</span>
              <q-spinner-dots size="16px" color="primary" class="flex-none!" v-if="chat.status === 'thinking'" />
              <span class="chats__time" v-else>{{ ago(chat.updatedAt) }}</span>
            </router-link>
            <q-btn
              flat
              no-caps
              size="sm"
              color="grey-5"
              label="More chats"
              class="w-full"
              :loading="chatsLoading"
              @click="loadChats(chatsPage + 1)"
              v-if="chatsPage < chatsLastPage"
            />
          </div>
        </aside>

        <section class="thread" v-if="!narrow || chatId">
          <header class="thread__head" v-if="chatId">
            <IconBtn icon="lucide-arrow-left" label="All chats" class="flex-none!" :to="{ name: 'admin.assistant' }" v-if="narrow" />
            <div class="thread__title">{{ current?.title || 'Chat' }}</div>
          </header>

          <div class="thread__body" ref="scroller">
            <template v-if="chatId">
              <BlockSkeleton :count="3" v-if="messagesLoading && !messages.length" />
              <template v-else>
                <div class="text-center" v-if="cursor">
                  <q-btn flat dense no-caps size="sm" color="grey-5" label="Earlier messages" :loading="olderLoading" @click="loadOlder" />
                </div>

                <template v-for="message in ordered" :key="message.id">
                  <div class="bubble bubble--admin" v-if="message.role === 'admin'">{{ message.content }}</div>

                  <div class="bubble bubble--assistant" v-else-if="message.role === 'assistant'">{{ message.content }}</div>

                  <div class="tool" :class="{ 'tool--failed': message.error }" v-else-if="message.role === 'tool'">
                    <q-icon :name="message.error ? 'lucide-circle-x' : 'lucide-check'" size="14px" class="flex-none!" />
                    <span>{{ toolLine(message) }}</span>
                    <q-tooltip max-width="320px" v-if="message.error">{{ message.error }}</q-tooltip>
                  </div>

                  <div class="action" :class="`action--${message.action.status}`" v-else-if="message.role === 'action' && message.action">
                    <div class="action__head">
                      <q-icon name="lucide-shield-half" size="18px" class="flex-none!" />
                      <span class="action__label">{{ message.action.status === 'pending' ? 'Needs your confirmation' : 'Proposed change' }}</span>
                      <q-badge
                        rounded
                        class="flex-none!"
                        :color="actionStatusLabels[message.action.status].color"
                        :label="actionStatusLabels[message.action.status].label"
                      />
                    </div>
                    <div class="action__summary">{{ message.action.summary }}</div>
                    <div class="action__error" v-if="message.action.error">{{ message.action.error }}</div>
                    <div class="action__buttons" v-if="message.action.status === 'pending'">
                      <q-btn
                        unelevated
                        no-caps
                        color="primary"
                        text-color="dark"
                        label="Confirm"
                        class="flex-none!"
                        :loading="deciding === message.action.id"
                        @click="decide(message.action, 'confirm')"
                      />
                      <q-btn
                        flat
                        no-caps
                        color="grey-4"
                        label="Cancel"
                        class="flex-none!"
                        :disable="deciding === message.action.id"
                        @click="decide(message.action, 'cancel')"
                      />
                    </div>
                  </div>
                </template>

                <div class="thinking" v-if="current?.status === 'thinking'">
                  <q-spinner-dots size="20px" color="primary" />
                  <span>Working on it</span>
                </div>
                <div class="failed" v-else-if="current?.status === 'failed'">
                  <q-icon name="lucide-circle-alert" size="16px" class="flex-none!" />
                  <span>{{ current.error || 'The assistant couldn\'t answer. Try again.' }}</span>
                </div>
              </template>
            </template>

            <div class="welcome" v-else>
              <q-icon name="lucide-bot" size="40px" color="grey-6" />
              <div class="mt-3 text-lg font-bold">What should we look at?</div>
              <div class="welcome__prompts">
                <button type="button" class="welcome__prompt" :key="prompt" @click="send(prompt)" v-for="prompt in prompts">
                  {{ prompt }}
                </button>
              </div>
            </div>
          </div>

          <form class="composer" @submit.prevent="send()">
            <q-input
              dark
              dense
              outlined
              autogrow
              class="composer__input"
              placeholder="Ask the assistant"
              maxlength="4000"
              :disable="!available"
              v-model="draft"
              @keydown.enter.exact.prevent="send()"
            />
            <q-btn
              round
              unelevated
              color="primary"
              text-color="dark"
              icon="lucide-send"
              type="submit"
              aria-label="Send"
              class="flex-none!"
              :loading="sending"
              :disable="!canSend"
            />
          </form>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { date, debounce, useMeta, useQuasar } from 'quasar';
import IconBtn from 'src/components/Buttons/IconBtn.vue';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import { useRealtimeChannel } from 'src/utils/realtime';
import {
  actionStatusLabels,
  cancelAssistantActionRequest,
  confirmAssistantActionRequest,
  loadAssistantChatsRequest,
  loadAssistantMessagesRequest,
  sendAssistantMessageRequest,
  startAssistantChatRequest,
  toolLine,
  type AssistantAction,
  type AssistantChat,
  type AssistantMessage,
} from 'src/utils/requests/assistant';

useMeta(() => ({
  title: 'Assistant',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const boot = useBootstrapStore();

const prompts = [
  'What is waiting in the moderation queue?',
  'Show releases waiting for review',
  'Find accounts suspended right now',
  'Are there open appeals on takedowns?',
];

const available = ref(true);
const chats = ref<AssistantChat[]>([]);
const chatsPage = ref(1);
const chatsLastPage = ref(1);
const chatsLoading = ref(false);

const current = ref<AssistantChat | null>(null);
const messages = ref<AssistantMessage[]>([]);
const cursor = ref<string | null>(null);
const messagesLoading = ref(false);
const olderLoading = ref(false);

const draft = ref('');
const sending = ref(false);
const deciding = ref<number | null>(null);
const scroller = ref<HTMLElement | null>(null);

const narrow = computed(() => $q.screen.lt.md);
const chatId = computed(() => (route.params.chat ? Number(route.params.chat) : null));
const thinking = computed(() => current.value?.status === 'thinking');
const canSend = computed(() => available.value && !thinking.value && draft.value.trim().length > 0);

/** Messages come newest first; the thread reads oldest first. */
const ordered = computed(() => [...messages.value].sort((a, b) => a.id - b.id));

const errorText = (e: unknown) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;

  return (Array.isArray(first) ? first[0] : first) || err?.message || "That didn't work.";
};

/** Short times for the list: "now", "5m", "3h", "Mar 4". */
const ago = (value: string) => {
  const seconds = (Date.now() - new Date(value).getTime()) / 1000;
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return date.formatDate(value, 'MMM D');
};

const scrollDown = async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
};

const loadChats = async (page = 1) => {
  chatsLoading.value = true;
  try {
    const body = await loadAssistantChatsRequest(page).send();
    chats.value = page === 1 ? body.chats : [...chats.value, ...body.chats];
    chatsPage.value = body.meta?.currentPage ?? page;
    chatsLastPage.value = body.meta?.lastPage ?? page;
    available.value = body.available;
  } catch (e) {
    notify(errorText(e), 'error');
  } finally {
    chatsLoading.value = false;
  }
};

/** Put a chat's new state in the list, at the top when it moved. */
const remember = (chat: AssistantChat) => {
  const rest = chats.value.filter((item) => item.id !== chat.id);
  chats.value = [chat, ...rest];
};

/** Load the newest page of the open chat and merge it with what's shown. */
const loadMessages = async () => {
  const id = chatId.value;
  if (!id) return;

  messagesLoading.value = !messages.value.length;
  try {
    const body = await loadAssistantMessagesRequest(id).send();
    if (id !== chatId.value) return;

    const grew = body.messages.some((message) => !messages.value.find((item) => item.id === message.id));
    const known = messages.value.filter((item) => !body.messages.find((message) => message.id === item.id));

    messages.value = [...body.messages, ...known];
    current.value = body.chat;
    if (!known.length) cursor.value = body.cursor;
    remember(body.chat);

    if (grew) void scrollDown();
  } catch (e) {
    notify(errorText(e), 'error');
  } finally {
    messagesLoading.value = false;
  }
};

const loadOlder = async () => {
  if (!chatId.value || !cursor.value) return;

  olderLoading.value = true;
  try {
    const body = await loadAssistantMessagesRequest(chatId.value, cursor.value).send();
    messages.value = [...messages.value, ...body.messages];
    cursor.value = body.cursor;
  } catch (e) {
    notify(errorText(e), 'error');
  } finally {
    olderLoading.value = false;
  }
};

const send = async (text?: string) => {
  const message = (text ?? draft.value).trim();
  if (!message || sending.value || thinking.value || !available.value) return;

  sending.value = true;
  try {
    if (chatId.value) {
      const body = await sendAssistantMessageRequest(chatId.value, message);
      messages.value = [body.data, ...messages.value];
      if (current.value) current.value = { ...current.value, status: 'thinking' };
      void scrollDown();
    } else {
      const body = await startAssistantChatRequest(message);
      remember(body.data);
      await router.push({ name: 'admin.assistant', params: { chat: body.data.id } });
    }
    draft.value = '';
  } catch (e) {
    notify(errorText(e), 'error');
  } finally {
    sending.value = false;
  }
};

const decide = async (action: AssistantAction, choice: 'confirm' | 'cancel') => {
  deciding.value = action.id;
  try {
    const request = choice === 'confirm' ? confirmAssistantActionRequest : cancelAssistantActionRequest;
    const body = await request(action.id);
    const message = messages.value.find((item) => item.action?.id === action.id);
    if (message) message.action = body.data;
    notify(body.data.error || body.message, body.data.status === 'failed' ? 'error' : 'success');
  } catch (e) {
    notify(errorText(e), 'error');
    void loadMessages();
  } finally {
    deciding.value = null;
  }
};

const reloadSoon = debounce(() => void loadMessages(), 300);

const { live } = useRealtimeChannel(() => (boot.user?.id ? `user.${boot.user.id}` : null), {
  'assistant.chat': ({ id }: { id: number }) => {
    if (id === chatId.value) reloadSoon();
  },
});

useFallbackPoll({ live, active: thinking, check: loadMessages, every: 2500 });

watch(
  chatId,
  (id) => {
    messages.value = [];
    cursor.value = null;
    current.value = id ? chats.value.find((chat) => chat.id === id) ?? null : null;
    if (id) void loadMessages();
  },
  { immediate: true },
);

onMounted(() => void loadChats());
</script>

<style lang="scss" scoped>
.unavailable {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: var(--tf-radius-lg);
  background: rgba(255, 193, 7, 0.08);
}

.assistant {
  display: flex;
  flex-wrap: nowrap;
  height: calc(100vh - 300px);
  min-height: 480px;
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}

.chats {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 260px;
  min-height: 0;
  border-right: 1px solid var(--tf-border);

  @media (max-width: 1023px) {
    width: 100%;
    border-right: 0;
  }

  &__list {
    flex: 1 1 auto;
    min-height: 0;
    padding: 12px 8px;
    overflow-y: auto;
  }

  &__empty {
    padding: 24px 8px;
    font-size: 13px;
    text-align: center;
    color: var(--tf-text-muted);
  }

  &__item {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    color: inherit;
    text-decoration: none;
    border-radius: 10px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &--active,
    &--active:hover {
      background: rgba(3, 191, 255, 0.12);
    }
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__time {
    flex: none;
    font-size: 12px;
    color: var(--tf-text-subtle);
  }
}

.thread {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;

  &__head {
    display: flex;
    flex: none;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--tf-border);
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;

    > * {
      flex: none;
    }
  }
}

.bubble {
  max-width: min(640px, 85%);
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-radius: 14px;

  &--admin {
    align-self: flex-end;
    color: var(--tf-on-primary);
    background: var(--tf-primary);
    border-bottom-right-radius: 4px;
  }

  &--assistant {
    align-self: flex-start;
    background: var(--tf-surface-2);
    border-bottom-left-radius: 4px;
  }
}

.tool {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  max-width: 85%;
  font-size: 12px;
  color: var(--tf-text-subtle);

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &--failed {
    color: var(--tf-danger);
  }
}

.action {
  align-self: flex-start;
  width: min(520px, 100%);
  padding: 12px 14px;
  border: 1px solid rgba(255, 193, 7, 0.35);
  border-radius: 12px;
  background: rgba(255, 193, 7, 0.06);

  &--done {
    border-color: rgba(76, 175, 80, 0.35);
    background: rgba(76, 175, 80, 0.06);
  }

  &--failed {
    border-color: rgba(244, 67, 54, 0.35);
    background: rgba(244, 67, 54, 0.06);
  }

  &--cancelled,
  &--expired {
    opacity: 0.7;
    border-color: var(--tf-border);
    background: transparent;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }

  &__label {
    flex: 1 1 auto;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--tf-text-muted);
  }

  &__summary {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.5;
  }

  &__error {
    margin-top: 6px;
    font-size: 13px;
    color: var(--tf-danger);
  }

  &__buttons {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    margin-top: 12px;
  }
}

.thinking,
.failed {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--tf-text-muted);
}

.failed {
  color: var(--tf-danger);
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  padding: 24px 0;
  text-align: center;

  &__prompts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-width: 520px;
    margin-top: 16px;
  }

  &__prompt {
    flex: none;
    padding: 8px 14px;
    font-size: 13px;
    color: inherit;
    cursor: pointer;
    border: 1px solid var(--tf-border);
    border-radius: 999px;
    background: transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.composer {
  display: flex;
  flex: none;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--tf-border);

  &__input {
    flex: 1 1 auto;
    min-width: 0;

    :deep(textarea) {
      max-height: 160px;
    }
  }
}
</style>
