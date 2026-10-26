<template>
  <div class="thread" :class="{ 'thread--compact': compact }">
    <div class="thread__scroll" ref="scroller" @scroll="onScroll">
      <div class="thread__inner">
        <div ref="topSentinel" class="thread__sentinel" />

        <div class="thread__status" v-if="loadingOlder">
          <q-spinner size="18px" color="grey-6" />
        </div>
        <div class="thread__status thread__status--start" v-else-if="loaded && !hasMore && messages.length">
          This is the start of the conversation.
        </div>

        <div class="thread__empty" v-if="loaded && !messages.length">
          <q-icon name="lucide-messages-square" size="40px" color="grey-7" />
          <div class="mt-2 text-base font-bold">No messages yet</div>
          <div class="text-sm text-grey-6">Say hello. Everyone on this {{ noun }} will see it.</div>
        </div>

        <ListSkeleton :rows="4" v-if="!loaded" />

        <template :key="row.message.id" v-for="row in rows">
          <div class="thread__day" v-if="row.day">
            <span>{{ row.day }}</span>
          </div>

          <div
            class="msg"
            :class="{
              'msg--mine': row.mine,
              'msg--first': row.first,
              'msg--last': row.last,
              'msg--flash': flashId === String(row.message.id),
            }"
            :data-id="row.message.id"
          >
            <div class="msg__avatar" v-if="!row.mine">
              <q-avatar size="30px" v-if="row.last">
                <img :src="row.message.user?.imageUrl || avatarFallback" :alt="row.message.user?.name" />
              </q-avatar>
            </div>

            <div class="msg__column">
              <div class="msg__name" v-if="row.first && !row.mine">{{ row.message.user?.name || 'Someone' }}</div>

              <div class="msg__line">
                <div
                  class="msg__bubble"
                  :class="{ 'msg__bubble--pending': row.message.pending, 'msg__bubble--failed': row.message.failed }"
                >
                  <button
                    type="button"
                    class="msg__quote"
                    v-if="row.message.parent"
                    @click="jumpTo(row.message.parent.id)"
                  >
                    <span class="msg__quote-name">{{ row.message.parent.user?.name || 'Someone' }}</span>
                    <span class="msg__quote-body">
                      <q-icon name="lucide-mic" size="14px" class="mr-1" v-if="row.message.parent.hasVoice" />
                      <q-icon name="lucide-audio-lines" size="14px" class="mr-1" v-else-if="row.message.parent.region" />
                      {{ row.message.parent.body || (row.message.parent.region ? regionLabel(row.message.parent.region) : '') }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="msg__region"
                    :aria-label="`Show ${regionLabel(row.message.region)} in the editor`"
                    v-if="row.message.region"
                    @click="openRegion(row.message.region)"
                  >
                    <q-icon name="lucide-audio-lines" size="18px" class="!flex-none" />
                    <span class="msg__region-text">
                      <span class="msg__region-label">{{ regionLabel(row.message.region) }}</span>
                      <span class="msg__region-hint">Show in the editor</span>
                    </span>
                    <q-icon name="lucide-arrow-up-right" size="16px" class="!flex-none" />
                  </button>
                  <VoiceNote :voice="row.message.voice" :mine="row.mine" v-if="row.message.voice" />
                  <div class="msg__body" :class="{ 'mt-1': row.message.voice }" v-if="row.message.body">{{ row.message.body }}</div>

                  <q-menu touch-position context-menu v-if="!row.message.pending">
                    <q-list dense dark class="min-w-40">
                      <q-item clickable v-close-popup @click="startReply(row.message)">
                        <q-item-section avatar><q-icon name="lucide-reply" /></q-item-section>
                        <q-item-section>Reply</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="copy(row.message.body)" v-if="row.message.body">
                        <q-item-section avatar><q-icon name="lucide-copy" /></q-item-section>
                        <q-item-section>Copy text</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="remove(row.message)" v-if="canDelete(row.message)">
                        <q-item-section avatar><q-icon name="lucide-trash-2" color="red-4" /></q-item-section>
                        <q-item-section class="text-red-4">Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </div>

                <div class="msg__actions" v-if="!row.message.pending && !row.message.failed">
                  <IconBtn size="sm" icon="lucide-reply" aria-label="Reply" @click="startReply(row.message)">
                    <q-tooltip>Reply</q-tooltip>
                  </IconBtn>
                </div>
              </div>

              <div class="msg__meta" v-if="row.last || row.message.failed || row.message.pending">
                <template v-if="row.message.failed">
                  <span class="text-red-4">Not sent.</span>
                  <button type="button" class="msg__retry" @click="retry(row.message)">Try again</button>
                </template>
                <template v-else-if="row.message.pending">Sending…</template>
                <template v-else>
                  {{ clock(row.message.createdAt) }}
                  <q-tooltip>{{ fullDate(row.message.createdAt) }}</q-tooltip>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <transition name="fade">
      <button type="button" class="thread__new" v-if="newBelow" @click="scrollToBottom(true)">
        {{ newBelow }} new message{{ newBelow === 1 ? '' : 's' }}
        <q-icon name="lucide-arrow-down" size="16px" />
      </button>
    </transition>

    <form class="composer" @submit.prevent="send">
      <div class="composer__reply" v-if="replyTo">
        <q-icon name="lucide-reply" size="18px" class="!flex-none" color="grey-5" />
        <div class="composer__reply-text">
          <div class="text-xs font-bold">Replying to {{ replyTo.user?.name || 'Someone' }}</div>
          <div class="text-xs truncate text-grey-5">{{ replyTo.body || (replyTo.voice ? 'Voice note' : '') }}</div>
        </div>
        <IconBtn size="sm" icon="lucide-x" class="!flex-none" aria-label="Cancel reply" @click="replyTo = null" />
      </div>

      <div class="composer__reply composer__reply--region" v-if="region">
        <q-icon name="lucide-audio-lines" size="18px" class="!flex-none" color="amber-5" />
        <div class="composer__reply-text">
          <div class="text-xs font-bold">About this part of the track</div>
          <div class="text-xs truncate text-grey-5">{{ regionLabel(region) }}</div>
        </div>
        <IconBtn size="sm" icon="lucide-x" class="!flex-none" aria-label="Remove the part of the track" @click="region = null" />
      </div>

      <div class="composer__row composer__row--recording" v-if="recorder.recording.value">
        <IconBtn
          icon="lucide-trash-2"
          class="!flex-none text-grey-5"
          aria-label="Discard recording"
          @click="recorder.cancel()"
        >
          <q-tooltip>Discard</q-tooltip>
        </IconBtn>
        <div class="recording" role="status" aria-live="polite">
          <span class="recording__dot" />
          <span class="recording__time">{{ clockShort(recorder.elapsed.value) }}</span>
          <span class="recording__meter" aria-hidden="true">
            <span
              class="recording__level"
              :style="{ height: `${Math.max(8, level * 100)}%` }"
              :key="i"
              v-for="(level, i) in meter"
            />
          </span>
        </div>
        <q-btn
          round
          unelevated
          icon="lucide-send"
          size="sm"
          class="!flex-none composer__send"
          aria-label="Send voice note"
          @click="sendVoice"
        />
      </div>

      <div class="composer__row" v-else>
        <textarea
          ref="input"
          rows="1"
          class="composer__input"
          maxlength="5000"
          :placeholder="readonly ? 'Sign in to send messages' : region ? 'Say something about this part' : 'Write a message'"
          :disabled="readonly"
          v-model="draft"
          @input="grow"
          @keydown.enter.exact.prevent="send"
          @keydown.esc="replyTo = null"
        />
        <q-btn
          round
          unelevated
          type="submit"
          icon="lucide-send"
          size="sm"
          class="!flex-none composer__send"
          :disable="readonly"
          aria-label="Send"
          v-if="draft.trim() || !recorder.supported"
        />
        <q-btn
          round
          unelevated
          icon="lucide-mic"
          size="sm"
          class="!flex-none composer__send composer__send--mic"
          :disable="readonly || starting"
          aria-label="Record a voice note"
          @click="startRecording"
          v-else
        >
          <q-tooltip>Record a voice note</q-tooltip>
        </q-btn>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { copyToClipboard, date, useQuasar } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { conversationKey, useConversationStore } from 'src/stores/conversation-store';
import { avatarFallback } from 'src/utils/imageFallback';
import { notify } from 'src/utils/helpers';
import { useRealtimeChannel } from 'src/utils/realtime';
import { MAX_RECORDING, useVoiceRecorder } from 'src/utils/voiceRecorder';
import VoiceNote from './VoiceNote.vue';
import {
  deleteMessageRequest,
  loadMessagesRequest,
  regionLabel,
  sendMessageRequest,
  type ChatMessage,
  type ChatRegion,
  type Conversation,
  type ConversationType,
  type OutgoingMessage,
} from 'src/utils/requests/conversations';
import type { ResponseBody } from 'src/utils/models';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

/**
 * One conversation as a chat: messages oldest to newest, grouped by sender,
 * with replies quoting what they answer. New messages arrive live.
 */
const props = defineProps<{
  type: ConversationType;
  id: number | string;
  /** Narrow layout for the corner dock */
  compact?: boolean;
  /** Whether it's on screen, so arriving messages count as read */
  active?: boolean;
  /** The viewer owns what this conversation is about and may delete any message */
  canDeleteAny?: boolean;
  /** Shown in the conversation preview list when the first message is sent */
  subject?: Conversation | null;
}>();

const $q = useQuasar();
const boot = useBootstrapStore();
const store = useConversationStore();

const messages = ref<ChatMessage[]>([]);
const cursor = ref<string | null>(null);
const hasMore = computed(() => !!cursor.value);
const loaded = ref(false);
const loadingOlder = ref(false);
const draft = ref('');
const replyTo = ref<ChatMessage | null>(null);
const newBelow = ref(0);
const flashId = ref<string | null>(null);
const scroller = ref<HTMLElement>();
const topSentinel = ref<HTMLElement>();
const input = ref<HTMLTextAreaElement>();
const region = ref<ChatRegion | null>(null);
const starting = ref(false);
const recorder = useVoiceRecorder();
const route = useRoute();
const router = useRouter();
/** What each unsent message was, so a failed one can be sent again */
const outgoing = new Map<string | number, OutgoingMessage>();
let observer: IntersectionObserver | null = null;
let tempId = 0;

const key = computed(() => conversationKey({ type: props.type, id: props.id }));
const me = computed(() => String(boot.user?.id ?? ''));
const readonly = computed(() => !boot.user?.id);
const noun = computed(() => ({ 'project-track': 'track', project: 'project', track: 'track', release: 'album' })[props.type]);

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

const dayLabel = (value: string) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.formatDate(d, d.getFullYear() === today.getFullYear() ? 'ddd, MMM D' : 'MMM D, YYYY');
};

const clock = (value: string) => date.formatDate(value, 'h:mm A');
const fullDate = (value: string) => date.formatDate(value, 'dddd, MMMM D, YYYY [at] h:mm A');

/**
 * Messages laid out for display. Consecutive messages from one person within
 * five minutes form a group: the name shows on the first, avatar and time on
 * the last.
 */
const rows = computed(() => {
  const list = messages.value;
  const together = (a?: ChatMessage, b?: ChatMessage) =>
    !!a &&
    !!b &&
    String(a.userId) === String(b.userId) &&
    sameDay(a.createdAt, b.createdAt) &&
    Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60e3 &&
    !b.parent;

  return list.map((message, i) => {
    const prev = list[i - 1];
    const next = list[i + 1];
    return {
      message,
      mine: String(message.userId) === me.value,
      day: !prev || !sameDay(prev.createdAt, message.createdAt) ? dayLabel(message.createdAt) : null,
      first: !together(prev, message),
      last: !together(message, next),
    };
  });
});

const nearBottom = () => {
  const el = scroller.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
};

const scrollToBottom = (smooth = false) => {
  newBelow.value = 0;
  void nextTick(() => {
    const el = scroller.value;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
};

const onScroll = () => {
  if (newBelow.value && nearBottom()) newBelow.value = 0;
};

const grow = () => {
  const el = input.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
};

const load = async () => {
  loaded.value = false;
  messages.value = [];
  cursor.value = null;
  newBelow.value = 0;
  try {
    const page = await loadMessagesRequest(props.type, props.id).send();
    messages.value = page.messages;
    cursor.value = page.cursor;
  } catch (e) {
    notify((e as ResponseBody)?.message || 'The conversation couldn\'t be loaded.', 'error');
  } finally {
    loaded.value = true;
    scrollToBottom();
  }
};

/** Load the page above the oldest message, keeping the view where it was. */
const loadOlder = async () => {
  if (!hasMore.value || loadingOlder.value || !messages.value.length) return;
  loadingOlder.value = true;
  const el = scroller.value;
  const before = el?.scrollHeight ?? 0;
  try {
    const page = await loadMessagesRequest(props.type, props.id, cursor.value).send();
    const known = new Set(messages.value.map((m) => String(m.id)));
    messages.value = [...page.messages.filter((m) => !known.has(String(m.id))), ...messages.value];
    cursor.value = page.cursor;
    await nextTick();
    if (el) el.scrollTop += el.scrollHeight - before;
  } catch {
    // Try again on the next scroll.
  } finally {
    loadingOlder.value = false;
  }
};

const add = (message: ChatMessage) => {
  if (messages.value.some((m) => String(m.id) === String(message.id))) return;
  const follow = nearBottom() || String(message.userId) === me.value;
  messages.value = [...messages.value, message];
  if (follow) scrollToBottom(true);
  else newBelow.value++;
};

const startReply = (message: ChatMessage) => {
  replyTo.value = message;
  void nextTick(() => input.value?.focus());
};

const deliver = async (temp: ChatMessage, payload: OutgoingMessage) => {
  outgoing.set(temp.id, payload);
  try {
    const { data } = await sendMessageRequest(props.type, props.id, payload).send();
    outgoing.delete(temp.id);
    // Keep playing the local copy of a voice note; it's the same audio.
    messages.value = messages.value.map((m) => (m.id === temp.id ? { ...data, voice: temp.voice && data.voice ? { ...data.voice, url: temp.voice.url } : data.voice } : m));
    if (props.subject) store.receive({ ...props.subject, key: key.value }, data, true);
  } catch (e) {
    messages.value = messages.value.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m));
    const errors = (e as ResponseBody)?.errors;
    const message = (errors && Object.values(errors)[0]) || (e as ResponseBody)?.message;
    if (message) notify(String(message), 'error');
  }
};

/** A message as it shows while it's on its way. */
const draftMessage = (payload: OutgoingMessage, parent: ChatMessage | null, voiceUrl?: string): ChatMessage => ({
  id: `tmp-${++tempId}`,
  body: payload.body ?? '',
  user: { id: boot.user.id, name: boot.user.fullname || boot.user.username || 'You', imageUrl: boot.user.imageUrl },
  userId: boot.user.id,
  type: parent ? 'reply' : 'comment',
  parent: parent ? { id: parent.id, body: parent.body, user: parent.user, region: parent.region, hasVoice: !!parent.voice } : null,
  conversation: { type: props.type, id: props.id },
  voice: payload.voice && voiceUrl ? { url: voiceUrl, duration: payload.voice.duration, waveform: payload.voice.waveform } : null,
  region: payload.region ? { ...payload.region } : null,
  createdAt: new Date().toISOString(),
  pending: true,
});

/** Send right away and show the message while it's on its way. */
const send = () => {
  const body = draft.value.trim();
  if (!body || readonly.value) return;

  const parent = replyTo.value;
  const payload: OutgoingMessage = { body, replyTo: parent?.id, region: region.value };
  const temp = draftMessage(payload, parent);

  draft.value = '';
  replyTo.value = null;
  region.value = null;
  void nextTick(grow);
  add(temp);
  void deliver(temp, payload);
};

const startRecording = async () => {
  if (readonly.value || recorder.recording.value) return;
  starting.value = true;
  const ok = await recorder.start(() => {
    notify(`Voice note limit reached. Sending.`, 'info');
    void sendVoice();
  });
  starting.value = false;
  if (!ok && recorder.error.value) notify(recorder.error.value, 'error');
};

const sendVoice = async () => {
  const recording = await recorder.stop();
  if (!recording || recording.duration < 0.6) {
    if (recording) URL.revokeObjectURL(recording.url);
    notify('Too short to send.', 'info');
    return;
  }

  const parent = replyTo.value;
  const payload: OutgoingMessage = {
    replyTo: parent?.id,
    region: region.value,
    voice: { blob: recording.blob, duration: recording.duration, waveform: recording.waveform },
  };
  const temp = draftMessage(payload, parent, recording.url);

  replyTo.value = null;
  region.value = null;
  add(temp);
  void deliver(temp, payload);
};

/** The live meter: the latest readings, padded so the bars start full width. */
const meter = computed(() => {
  const levels = recorder.levels.value;
  return [...Array(Math.max(0, 40 - levels.length)).fill(0), ...levels] as number[];
});

const clockShort = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const retry = (message: ChatMessage) => {
  const payload = outgoing.get(message.id);
  if (!payload) return;
  messages.value = messages.value.map((m) => (m.id === message.id ? { ...m, failed: false, pending: true } : m));
  void deliver(message, payload);
};

/**
 * Show the part of the track a message is about. On the track's page the
 * editor jumps there; anywhere else, the track's page opens at that part.
 */
const openRegion = (target: ChatRegion) => {
  const trackId = target.trackId ?? (props.type === 'project-track' ? props.id : undefined);
  const projectId = target.projectId ?? props.subject?.context.projectId;
  if (!trackId) return;

  const here = route.name === 'studio.project.track' && String(route.params.track_id) === String(trackId);
  // On a phone the chat covers the editor, so tuck it away.
  if (props.compact && $q.screen.lt.sm) store.dock.minimized = true;

  if (here) {
    store.showRegion({ ...target, trackId });
    return;
  }
  if (!projectId) return;

  // Keep the chat open next to the editor.
  if (!props.compact && !$q.screen.lt.sm) store.openDock({ type: 'project-track', id: trackId, title: props.subject?.title });
  void router.push({
    name: 'studio.project.track',
    params: { project_id: projectId, track_id: trackId },
    query: { region: [target.start, target.end, target.stemId ?? ''].join('~') },
  });
};

const canDelete = (message: ChatMessage) =>
  !String(message.id).startsWith('tmp-') && (String(message.userId) === me.value || props.canDeleteAny);

const remove = (message: ChatMessage) => {
  $q.dialog({
    dark: true,
    title: 'Delete message',
    message: 'Delete this message for everyone?',
    cancel: { flat: true, label: 'Keep' },
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await deleteMessageRequest(props.type, props.id, message.id).send();
      messages.value = messages.value.filter((m) => m.id !== message.id);
    } catch (e) {
      notify((e as ResponseBody)?.message || 'The message couldn\'t be deleted.', 'error');
    }
  });
};

const copy = (text: string) => {
  void copyToClipboard(text).then(() => notify('Copied.', 'success'));
};

/** Scroll to a quoted message and flash it, if it's loaded. */
const jumpTo = (id: string | number) => {
  const el = scroller.value?.querySelector(`[data-id="${id}"]`);
  if (!el) {
    notify('That message is further up. Scroll up to load it.', 'info');
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashId.value = String(id);
  setTimeout(() => (flashId.value = null), 1600);
};

useRealtimeChannel(() => `conversation.${props.type}.${props.id}`, {
  'comment.posted': ({ comment }: { comment: ChatMessage }) => {
    if (!comment.body) comment.body = (comment as unknown as { comment: string }).comment;
    add(comment);
  },
  'comment.deleted': ({ comment }: { comment: ChatMessage }) => {
    messages.value = messages.value.filter((m) => String(m.id) !== String(comment.id));
  },
});

watch(
  () => [props.active, key.value] as const,
  ([active, current], old) => {
    if (old && old[1] !== current) store.setVisible(old[1], false);
    store.setVisible(current, !!active);
  },
  { immediate: true },
);

watch(key, () => {
  replyTo.value = null;
  region.value = null;
  recorder.cancel();
  void load();
});

/** Pick up a part of the track someone chose to message about. */
watch(
  () => store.regionDraft,
  (pending) => {
    if (!pending || pending.key !== key.value) return;
    region.value = pending.region;
    store.regionDraft = null;
    void nextTick(() => input.value?.focus());
  },
  { immediate: true },
);

onMounted(() => {
  void load();
  observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loaded.value && void loadOlder(), {
    root: scroller.value,
    rootMargin: '200px 0px 0px 0px',
  });
  if (topSentinel.value) observer.observe(topSentinel.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  store.setVisible(key.value, false);
});

defineExpose({ focus: () => input.value?.focus() });
</script>

<style lang="scss" scoped>
$mine: #0b84b3;
$theirs: #23272f;

.thread {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #121318;

  &__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 12px 16px 8px;
  }

  &__inner {
    display: flex;
    flex-direction: column;
    max-width: 760px;
    margin: 0 auto;
  }

  &--compact &__scroll {
    padding: 10px 10px 6px;
  }

  &__sentinel {
    height: 1px;
  }

  &__status {
    display: flex;
    justify-content: center;
    padding: 8px 0;

    &--start {
      font-size: 12px;
      color: #8a8f98;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 16px;
    text-align: center;
  }

  &__day {
    display: flex;
    justify-content: center;
    margin: 14px 0 6px;

    span {
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #b3b8c2;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
    }
  }

  &__new {
    position: absolute;
    left: 50%;
    bottom: 76px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    border-radius: 999px;
    background: $mine;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    transform: translateX(-50%);
  }
}

.msg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 2px;
  border-radius: 12px;
  transition: background-color 0.4s ease;

  &--first {
    margin-top: 10px;
  }

  &--flash {
    background: rgba(3, 191, 255, 0.12);
  }

  &--mine {
    flex-direction: row-reverse;
  }

  &__avatar {
    flex: none;
    width: 30px;
  }

  &__column {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    max-width: min(78%, 560px);
  }

  &--mine &__column {
    align-items: flex-end;
  }

  &__name {
    margin: 0 0 2px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #9fd8ef;
  }

  &__line {
    display: flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
  }

  &--mine &__line {
    flex-direction: row-reverse;
  }

  &__bubble {
    min-width: 0;
    padding: 7px 12px;
    font-size: 14px;
    line-height: 1.4;
    color: #e9ecf1;
    border-radius: 18px;
    background: $theirs;
    cursor: default;
    user-select: text;
  }

  // Corners next to the sender's side tighten inside a group.
  &:not(&--first) &__bubble {
    border-top-left-radius: 6px;
  }

  &:not(&--last) &__bubble {
    border-bottom-left-radius: 6px;
  }

  &--mine &__bubble {
    color: #fff;
    background: $mine;
    border-radius: 18px;
  }

  &--mine:not(&--first) &__bubble {
    border-top-right-radius: 6px;
  }

  &--mine:not(&--last) &__bubble {
    border-bottom-right-radius: 6px;
  }

  &__bubble--pending {
    opacity: 0.65;
  }

  &__bubble--failed {
    outline: 1px solid #ff6b6b;
  }

  &__body {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &__quote {
    display: block;
    width: 100%;
    margin: 2px 0 6px;
    padding: 4px 8px;
    text-align: left;
    border-left: 3px solid #4fc6f0;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.22);
    cursor: pointer;
  }

  &--mine &__quote {
    border-left-color: rgba(255, 255, 255, 0.85);
  }

  &__quote-name {
    display: block;
    font-size: 12px;
    font-weight: 700;
  }

  &__quote-body {
    display: -webkit-box;
    overflow: hidden;
    font-size: 12px;
    opacity: 0.8;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__region {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 200px;
    margin: 2px 0 6px;
    padding: 6px 10px;
    color: #ffd666;
    text-align: left;
    border: 1px solid rgba(255, 196, 0, 0.35);
    border-radius: 10px;
    background: rgba(255, 196, 0, 0.1);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background: rgba(255, 196, 0, 0.18);
    }
  }

  &--mine &__region {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.45);
    background: rgba(0, 0, 0, 0.18);
  }

  &__region-text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
  }

  &__region-label {
    overflow: hidden;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__region-hint {
    font-size: 11px;
    opacity: 0.75;
  }

  &__actions {
    flex: none;
    opacity: 0;
    color: #9aa0aa;
    transition: opacity 0.15s ease;
  }

  &:hover &__actions,
  &__actions:focus-within {
    opacity: 1;
  }

  @media (hover: none) {
    &__actions {
      display: none;
    }
  }

  &__meta {
    margin: 3px 8px 0;
    font-size: 11px;
    color: #8a8f98;
  }

  &__retry {
    margin-left: 6px;
    font-weight: 600;
    color: #4fc6f0;
    text-decoration: underline;
  }
}

.composer {
  flex: none;
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: #16181e;

  &__reply {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    padding: 6px 6px 6px 10px;
    border-left: 3px solid #4fc6f0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
  }

  &__reply-text {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__reply--region {
    border-left-color: #ffc400;
    background: rgba(255, 196, 0, 0.08);
  }

  &__row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    max-width: 760px;
    margin: 0 auto;
  }

  &__input {
    flex: 1 1 auto;
    min-height: 40px;
    max-height: 140px;
    padding: 9px 14px;
    font-size: 14px;
    line-height: 1.4;
    color: #f1f3f6;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    outline: none;
    background: #0f1014;
    resize: none;

    &:focus {
      border-color: #03bfff;
    }

    &::placeholder {
      color: #7d828c;
    }
  }

  &__send {
    width: 40px;
    height: 40px;
    color: #fff;
    background: #03a9e6;

    &--mic {
      color: #e9ecf1;
      background: #2a2e37;
    }
  }

  &__row--recording {
    align-items: center;
  }
}

.recording {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(255, 82, 82, 0.4);
  border-radius: 20px;
  background: rgba(255, 82, 82, 0.08);

  &__dot {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff5252;
    animation: pulse 1.2s ease-in-out infinite;
  }

  &__time {
    flex: none;
    min-width: 34px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: #ffb3b3;
  }

  &__meter {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    height: 24px;
    min-width: 0;
    overflow: hidden;
  }

  &__level {
    flex: none;
    width: 3px;
    border-radius: 2px;
    background: #ff8a80;
    transition: height 0.1s linear;
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
