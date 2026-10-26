<template>
  <!-- component -->
  <div class="antialiased">
    <h1 class="max-w-screen-sm px-4 mx-auto text-2xl font-bold" v-if="!hideTitle">
      Discussion
    </h1>
    <q-scroll-area
      class="w-full h-screen max-w-screen-sm max-h-screen p-4 mx-auto overflow-y-auto"
    >
      <div class="space-y-4">
        <div
          class="flex-1 px-8 py-2 leading-relaxed text-center border border-gray-700 border-solid rounded-lg sm:px-6 sm:py-4"
          v-if="!comments.length"
        >
          It's silent here, Be the first to {{ label }}!
        </div>
        <q-form
          class="border border-gray-700 border-solid rounded-lg"
          ref="formRef"
          @submit="send"
        >
          <q-input
            outlined
            autogrow
            required
            no-error-icon
            hide-bottom-space
            lazy-rules="ondemand"
            type="textarea"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            :rules="[(e) => !!e || 'Enter a valid ' + label]"
            :error="!!errors.comment"
            :placeholder="`Write a ${label}`"
            :error-message="errors.comment"
            v-model="form.comment"
          >
            <template #append>
              <q-btn
                flat
                dense
                color="primary"
                icon="send"
                :loading="loading"
                @click="formRef.submit()"
              />
            </template>
          </q-input>
        </q-form>
        <CommentCard
          class="flex"
          :id="id"
          :key="comment.id"
          :label="label"
          :params="params"
          :comment="comment"
          :expanded="!!comment.replies?.length && (i === 0 || comment.expanded)"
          @commented="(e) => emit('commented', e, 'reply')"
          v-intersection="(e) => onIntersect(e, i === comments.length - 1)"
          v-for="(comment, i) in comments"
        >
        </CommentCard>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { useForm, usePagination } from 'alova/client';
import { notify } from 'src/utils/helpers';
import { GenericData, ResponseBody, UserComment } from 'src/utils/models';
import {
  loadCommentsRequest,
  writeCommentsRequest,
} from 'src/utils/requests/requests';
import { computed, PropType, provide, ref } from 'vue';
import { useRealtimeChannel } from 'src/utils/realtime';
import { liveRepliesKey, type LiveReply } from 'src/utils/comments';
import { useRoute } from 'vue-router';
import CommentCard from '../Cards/CommentCard.vue';

const formRef = ref();
const route = useRoute();

const emit = defineEmits<{
  commented: [value: UserComment, type: 'comment' | 'reply'];
}>();

const props = defineProps({
  id: {
    type: [String, Number],
    required: false,
  },
  label: { type: String, default: 'comment' },
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideTitle: Boolean,
});

const initComments = defineModel<UserComment[]>('initComments', {
  default: () => [],
});

const {
  page,
  data: comments,
  update,
  isLastPage,
} = usePagination(
  () =>
    loadCommentsRequest(
      route.params.project_id || String(props.id),
      undefined,
      {
        with: 'user',
        ...props.params,
      },
    ),
  {
    total: (e) => e.meta?.total || 0,
    append: true,
    middleware: (_, next) => (!!route.params.project_id || !!props.id ? next() : undefined),
    immediate: props.immediate,
    initialData: { data: initComments.value },
    watchingStates: [() => route.params.project_id, () => props.id],
  },
);

const errors = computed(
  () => (error.value as unknown as ResponseBody)?.errors || {},
);

const { form, send, error, reset, loading, onSuccess } = useForm(
  (f) =>
    writeCommentsRequest(f, route.params.project_id || String(props.id), {
      with: 'user',
      ...props.params,
    }),
  {
    initialForm: {
      comment: '',
    },
  },
);

/**
 * The conversation's realtime channel, matching what the API broadcasts on.
 */
const channel = computed(() => {
  const base = props.params.baseUrl || 'projects';
  if (base === 'tracks') return props.id ? `conversation.track.${props.id}` : null;
  if (base === 'releases') return props.id ? `conversation.release.${props.id}` : null;
  if (props.params.track_id) return `conversation.project-track.${props.params.track_id}`;
  const id = props.params.project_id || route.params.project_id || props.id;
  return id ? `conversation.project.${id}` : null;
});

// Replies are shown by each comment's card; hand them over from here.
const liveReply = ref<LiveReply | null>(null);
provide(liveRepliesKey, liveReply);

useRealtimeChannel(channel, {
  'comment.posted': ({ comment }: { comment: UserComment }) => {
    if (comment.type === 'reply') {
      const parent = comments.value.find((c) => String(c.id) === String(comment.cid));
      if (parent) parent.repliesCount++;
      liveReply.value = { action: 'posted', comment };
      return;
    }

    if (comments.value.some((c) => String(c.id) === String(comment.id))) return;
    update({ data: [...comments.value, comment] });
    emit('commented', comment, 'comment');
  },
  'comment.deleted': ({ comment }: { comment: UserComment }) => {
    if (comment.type === 'reply') {
      const parent = comments.value.find((c) => String(c.id) === String(comment.cid));
      if (parent && parent.repliesCount > 0) parent.repliesCount--;
      liveReply.value = { action: 'deleted', comment };
      return;
    }

    update({ data: comments.value.filter((c) => String(c.id) !== String(comment.id)) });
  },
});

onSuccess(({ data }) => {
  reset();
  emit('commented', data.data, 'comment');
  update({ data: [...comments.value, data.data] });
  notify(data.message, data.status);
});

const onIntersect = (
  evt: IntersectionObserverEntry,
  isLast: boolean,
): void => {
  if (isLast && !isLastPage.value && evt.isIntersecting) {
    page.value++;
  }
};
</script>
