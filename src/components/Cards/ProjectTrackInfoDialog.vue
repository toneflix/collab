<template>
  <slot :toggle="() => (toggle = !toggle)">
    <q-btn icon="fas fa-info-circle" v-bind="$attrs" @click="toggle = !toggle">
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
  <q-dialog transition-show="rotate" transition-hide="rotate" v-model="toggle">
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>
          <span class="text-bold">{{ project.title }} Project:</span>
          {{ track.id ? `Update Track (${track.title})` : 'Create Track' }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
      <q-separator />
      <q-card-section class="scroll max-h-[60vh]">
        <q-form
          ref="trackForm"
          @submit="send"
          class="grid md:gap-y-3 md:grid-cols-2 md:gap-x-6"
        >
          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400">
              Track Title
              <span class="text-center text-red-500">*</span>
            </label>
            <q-input
              outlined
              required
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              input-class="custom-input-class"
              placeholder="Name of your track"
              :error="!!errors.title || !!errors['release.title']"
              :error-message="errors.title || errors['release.title']"
              v-model="form.title"
              @update:model-value="
                (v) => (form.slug = (v as string)?.slug('-'))
              "
            />
          </div>

          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400">
              Genre
              <span class="text-center text-red-500">*</span>
            </label>
            <q-select
              outlined
              required
              emit-value
              map-options
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              label="Genre of your track"
              input-class="custom-input-class"
              option-value="id"
              option-label="title"
              :error="!!errors.genre_id || !!errors['release.genre_id']"
              :error-message="errors.genre_id || errors['release.genre_id']"
              :options="genres"
              v-model="form.genre_id"
            />
          </div>
          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400"> Artist </label>
            <UserSearchInput
              outlined
              required
              allow-create
              hide-bottom-space
              color="primary"
              hint="You can add more artists when you're ready to release."
              class="custom-q-class no-fill"
              input-class="custom-input-class"
              :error="!!errors.artist_id"
              :error-message="errors.artist_id"
              :params="{ user_id: user.id }"
              v-model="artist"
              @selected="
                (e) => {
                  form.artist = e;
                  form.artist_id = e.id;
                }
              "
            />
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md">
        <q-btn
          no-caps
          color="primary"
          class="text-xl rounded-lg"
          label="Save"
          :loading="saving"
          @click="trackForm.submit()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {
  BaseOption,
  Project,
  ResponseBody,
  ProjectTrack,
  UploadData,
  User,
} from 'src/utils/models';
import { PropType, computed, ref } from 'vue';
import { genres } from 'src/utils/dummy';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import UserSearchInput from '../Utilities/UserSearchInput.vue';
import { useForm } from '@alova/scene-vue';
import { saveProjectTrackRequest } from 'src/utils/requests';
import { notify } from 'src/utils/helpers';

defineOptions({
  name: 'ProjectTrackInfoDialog',
});

const emit = defineEmits<{
  saved: [value: ProjectTrack];
  created: [value: ProjectTrack];
}>();

const props = defineProps({
  track: {
    type: Object as PropType<ProjectTrack>,
    default: () => ({}) as ProjectTrack,
  },
  project: {
    type: Object as PropType<Project>,
    default: () => ({}) as Project,
  },
  btnLabel: {
    type: String,
    default: 'Track Info',
  },
});

const user = computed(() => useBootstrapStore().user || {});
const artist = ref<User & BaseOption>(
  (props.track.artist || {}) as User & BaseOption,
);
const toggle = ref(false);
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);
const trackForm = ref();

const {
  form,
  send,
  error,
  loading: saving,
  // onError,
  onSuccess,
} = useForm((f) => saveProjectTrackRequest(f, props.project), {
  store: false,
  initialForm: {
    ...props.track,
    privacy: props.track.privacy || 'private',
  } as unknown as ProjectTrack & UploadData,
});

onSuccess(({ data }) => {
  if (props.track.id) {
    emit('saved', data.data as ProjectTrack);
  } else {
    emit('created', data.data as ProjectTrack);
    toggle.value = false;
  }
  notify(data.message, data.status);
});

defineExpose({ toggle: () => (toggle.value = !toggle.value) });
</script>
