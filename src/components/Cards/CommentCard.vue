<template>
  <div class="flex flex-nowrap">
    <div class="flex-shrink-0 mr-3">
      <q-avatar size="lg" color="grey-6">
        <q-img no-spinner loading="eager" :src="comment.user.imageUrl" :error-src="avatarFallback" alt="" />
      </q-avatar>
    </div>
    <div class="flex flex-col">
      <div
        class="flex-1 px-4 py-2 leading-relaxed border border-gray-700 border-solid rounded-lg sm:px-6 sm:py-4"
      >
        <div class="flex justify-around">
          <div>
            <strong>{{ comment.user.name }}</strong>
            <span class="ml-3 text-xs text-gray-400">
              {{ timeAgoStamp(comment.createdAt, 'facebook', 'HH MMM, YYYY') }}
            </span>
          </div>
          <div class="flex-none">
            <TDropdown
              flat
              dense
              rounded
              icon="fas fa-ellipsis"
              color="white"
              item-name="collaber"
              dropdown-icon="none"
              :links="[
                {
                  icon: 'fas fa-user-lock',
                  label: 'Block User',
                  color: 'red',
                  loading: blocking,
                  click: () => flag(comment, 'user'),
                },
                {
                  icon: 'fas fa-flag',
                  label: 'Report Comment',
                  color: 'white',
                  loading: reporting,
                  click: () => flag(comment, 'comment'),
                },
              ]"
              @click.stop.prevent
            />
          </div>
        </div>
        <p class="flex items-center w-full gap-2 text-sm no-wrap">
          <span class="block">
            {{ comment.comment }}
          </span>

          <q-btn
            flat
            dense
            no-caps
            padding="none"
            icon="reply"
            class="self-center flex-none text-sm font-semibold text-white"
            @click="showForm = !showForm"
          >
          </q-btn>
        </p>

        <h4
          class="flex justify-start gap-1 my-5 text-xs font-bold text-gray-400 uppercase cursor-pointer"
          @click="expanded = !expanded"
          v-if="comment.repliesCount && expanded"
        >
          <q-spinner class="flex-none" v-if="loadingComments" />
          <span>
            {{ expanded ? 'Hide Replies' : `${comment.repliesCount} Replies` }}
          </span>
        </h4>
        <q-btn
          dense
          flat
          no-caps
          class="text-sm font-semibold text-gray-500"
          v-else-if="comment.repliesCount"
          @click="expanded = !expanded"
        >
          {{ `${comment.repliesCount} Replies` }}
        </q-btn>

        <div class="space-y-4" v-if="expanded">
          <div class="flex" :key="reply.id" v-for="reply in comments">
            <div class="flex-shrink-0 mr-3">
              <q-avatar size="lg" color="grey-6">
                <q-img
                  no-spinner
                  loading="eager"
                  :src="reply.user.imageUrl" :error-src="avatarFallback"
                  alt=""
                />
              </q-avatar>
            </div>
            <div
              class="flex-1 px-4 py-2 leading-relaxed rounded-lg sm:px-6 sm:py-4"
            >
              <div class="flex justify-around">
                <div>
                  <strong>{{ reply.user.name }}</strong>
                  <span class="ml-3 text-xs text-gray-400">
                    {{
                      timeAgoStamp(reply.createdAt, 'facebook', 'HH MMM, YYYY')
                    }}
                  </span>
                </div>
                <div class="flex-none">
                  <TDropdown
                    flat
                    dense
                    rounded
                    icon="fas fa-ellipsis"
                    color="white"
                    item-name="collaber"
                    dropdown-icon="none"
                    :links="[
                      {
                        icon: 'fas fa-user-lock',
                        label: 'Block User',
                        color: 'red',
                        loading: blocking,
                        click: () => flag(reply, 'user'),
                      },
                      {
                        icon: 'fas fa-flag',
                        label: 'Report Comment',
                        color: 'white',
                        loading: reporting,
                        click: () => flag(reply, 'comment'),
                      },
                    ]"
                    @click.stop.prevent
                  />
                </div>
              </div>
              <p class="text-xs sm:text-sm">
                {{ reply.comment }}
              </p>
            </div>
          </div>
        </div>

        <div class="relative text-center">
          <q-btn
            dense
            flat
            no-caps
            class="text-sm font-semibold text-gray-500"
            @click="page++"
            v-if="expanded && !isLastPage"
          >
            Show More
          </q-btn>
        </div>
      </div>

      <q-form
        class="mt-1 rounded-lg"
        ref="formRef"
        @submit="send"
        v-if="showForm"
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
          @blur="showForm = false"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { avatarFallback } from 'src/utils/imageFallback';
import { useForm, usePagination } from 'alova/client';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import { GenericData, ResponseBody, UserComment } from 'src/utils/models';
import {
  loadCommentsRequest,
  writeCommentsRequest,
} from 'src/utils/requests/requests';
import { computed, inject, PropType, watch, ref } from 'vue';
import { liveRepliesKey } from 'src/utils/comments';
import { useRoute } from 'vue-router';
import TDropdown from '../Utilities/TDropdown.vue';
import { requestFlagContent } from 'src/utils/requests/content';

const emit = defineEmits<{
  commented: [value: UserComment, type: 'comment' | 'reply'];
  flagged: [value: UserComment, type: 'comment' | 'reply'];
}>();

const props = defineProps({
  id: {
    type: [String, Number],
    required: false,
  },
  label: { type: String, default: 'comment' },
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
});

const route = useRoute();
const formRef = ref();
const showForm = ref(false);
const blocking = ref(false);
const reporting = ref(false);

const flag = (comment: UserComment, type: 'user' | 'comment') => {
  const id = type === 'user' ? comment.userId : comment.id;
  const action = type === 'user' ? 'block' : 'report';
  requestFlagContent({ type, id, label: type, action }, (state) => {
    blocking.value = state === 'loading' && type === 'user';
    reporting.value = state === 'loading' && type === 'comment';
  }).then(() => {
    emit('flagged', comment, comment.type);
  });
};

const expanded = defineModel<boolean>('expanded', {
  type: Boolean,
  default: false,
});

const comment = defineModel<UserComment>('comment', {
  required: true,
});

const {
  page,
  update,
  data: comments,
  send: loadComments,
  loading: loadingComments,
  isLastPage,
} = usePagination(
  () =>
    loadCommentsRequest(
      route.params.project_id || String(props.id),
      String(comment.value.id),
      {
        with: 'user',
        ...props.params,
      },
    ),
  {
    total: (e) => e.meta?.total || 0,
    append: true,
    middleware: (_, next) => ((!!route.params.project_id || !!props.id) && !!comment.value.id ? next() : undefined),
    immediate: props.immediate,
    initialData: { data: [] },
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
      id: comment.value.id,
      comment: '',
    },
  },
);

onSuccess(({ data }) => {
  expanded.value = true;
  comment.value.repliesCount++;
  emit('commented', data.data, 'reply');
  reset();
  update({ data: [...comments.value, data.data] });
  notify(data.message, data.status);
});

// Replies others post or delete while this thread is open.
const liveReply = inject(liveRepliesKey, null);
watch(
  () => liveReply?.value,
  (live) => {
    if (!live || String(live.comment.cid) !== String(comment.value.id) || !expanded.value) return;
    const exists = comments.value.some((c) => String(c.id) === String(live.comment.id));
    if (live.action === 'posted' && !exists) update({ data: [...comments.value, live.comment] });
    if (live.action === 'deleted') update({ data: comments.value.filter((c) => String(c.id) !== String(live.comment.id)) });
  },
);

watch(expanded, (e) => {
  e && loadComments();
  !e && update({ data: [] });
});
</script>
