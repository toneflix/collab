<template>
  <div class="flex">
    <div class="flex-shrink-0 mr-3">
      <q-avatar size="lg" color="grey-6">
        <q-img no-spinner loading="eager" :src="comment.user.imageUrl" alt="" />
      </q-avatar>
    </div>
    <div class="flex flex-col">
      <div
        class="flex-1 px-4 py-2 leading-relaxed border border-gray-700 border-solid rounded-lg sm:px-6 sm:py-4"
      >
        <strong>{{ comment.user.name }}</strong>
        <span class="ml-3 text-xs text-gray-400">
          {{ timeAgoStamp(comment.createdAt, 'facebook', 'HH MMM, YYYY') }}
        </span>
        <p class="flex items-center w-full gap-2 text-sm">
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
                  :src="reply.user.imageUrl"
                  alt=""
                />
              </q-avatar>
            </div>
            <div
              class="flex-1 px-4 py-2 leading-relaxed rounded-lg sm:px-6 sm:py-4"
            >
              <strong>{{ reply.user.name }}</strong>
              <span class="ml-3 text-xs text-gray-400">
                {{ timeAgoStamp(reply.createdAt, 'facebook', 'HH MMM, YYYY') }}
              </span>
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
import { useForm, usePagination } from '@alova/scene-vue';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import { GenericData, ResponseBody, UserComment } from 'src/utils/models';
import {
  loadProjectCommentsRequest,
  writeProjectCommentsRequest,
} from 'src/utils/requests';
import { computed, PropType, watch, ref } from 'vue';
import { useRoute } from 'vue-router';

const showForm = ref(false);
const formRef = ref();
const route = useRoute();

const props = defineProps({
  label: { type: String, default: 'comment' },
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
});

const expanded = defineModel<boolean>('expanded', {
  type: Boolean,
  default: false,
});

const comment = defineModel<UserComment>('comment', {
  default: () => [],
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
    loadProjectCommentsRequest(
      route.params.project_id,
      comment.value.id as string,
      {
        with: 'user',
        ...props.params,
      },
    ),
  {
    total: (e) => e.meta?.total || 0,
    append: true,
    sendable: () => !!route.params.project_id && !!comment.value.id,
    immediate: props.immediate,
    initialData: { data: [] },
    watchingStates: [() => route.params.project_id],
  },
);

const errors = computed(
  () => (error.value as unknown as ResponseBody)?.errors || {},
);

const { form, send, error, reset, loading, onSuccess } = useForm(
  (f) =>
    writeProjectCommentsRequest(f, route.params.project_id, {
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
  reset();
  expanded.value = true;
  comment.value.repliesCount++;
  update({ data: [...comments.value, data.data] });
  notify(data.message, data.status);
});

watch(expanded, (e) => {
  e && loadComments();
  !e && update({ data: [] });
});
</script>
