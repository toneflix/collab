<template>
  <slot :toggle="() => (toggle = !toggle)">
    <q-btn icon="lucide-info" v-bind="$attrs" @click="toggle = !toggle">
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
        <IconBtn icon="lucide-x" v-close-popup />
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
              v-model="form.genreId"
            />
            <div class="flex items-center gap-2 mt-2 text-sm text-grey-5" v-if="suggestedGenre">
              <q-icon name="lucide-sparkles" size="14px" />
              <span>The audio sounds like {{ suggestedGenre.title }}.</span>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                label="Use it"
                class="flex-none!"
                @click="form.genreId = suggestedGenre.id"
              />
            </div>
          </div>
          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400"> Artist </label>
            <UserSearchInput
              outlined
              required
              allow-create
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              input-class="custom-input-class"
              :error="!!errors.artist_id"
              :error-message="errors.artist_id"
              :params="{ user_id: user.id }"
              v-model="artist"
              @selected="
                (e) => {
                  form.artist = e;
                  form.artistId = e.id;
                }
              "
            />
          </div>
          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400"> Featured artists </label>
            <FeaturedArtistsInput
              outlined
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              input-class="custom-input-class"
              :exclude="form.artistId"
              :error="!!featuredError"
              :error-message="featuredError"
              v-model="form.featured"
            />
          </div>

          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400">Track Privacy</label>
            <q-option-group
              inline
              type="radio"
              :options="trackPrivacyOptions"
              v-model="form.privacy"
            />
            <p class="mt-1 mb-0 text-sm text-fg-muted">{{ privacyHint }}</p>
            <p class="mt-1 mb-0 text-sm text-red-5" v-if="errors.privacy">{{ errors.privacy }}</p>
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
import { useGenres } from 'src/composables/useGenres';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import UserSearchInput from '../Utilities/UserSearchInput.vue';
import FeaturedArtistsInput from '../Utilities/FeaturedArtistsInput.vue';
import { useForm } from 'alova/client';
import { saveProjectTrackRequest } from 'src/utils/requests/requests';
import { notify } from 'src/utils/helpers';

defineOptions({
  name: 'ProjectTrackInfoDialog',
});

const { genres } = useGenres();
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
const featuredError = computed(
  () => Object.entries(errors.value).find(([key]) => key.startsWith('featured_ids'))?.[1],
);

const trackPrivacyOptions = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
];

const privacyHint = computed(() => {
  if (props.project.privacy === 'private') return 'The project is private, so only its people see this track.';
  if (props.project.tracksPublic) return 'The project makes every track public, so visitors see this track either way.';
  return form.value.privacy === 'public'
    ? 'Visitors to the project can see and play this track.'
    : 'Only the project\'s people see this track.';
});

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
    featured: props.track.featured,
    privacy: props.track.privacy || 'private',
  } as unknown as ProjectTrack & UploadData,
});

/** The genre the preview mix sounds like, offered when it isn't the chosen one */
const suggestedGenre = computed(() => {
  const id = props.track.styles?.suggestedGenreId;
  if (!id || String(id) === String(form.value.genreId ?? '')) return null;
  return genres.value.find((genre) => String(genre.id) === String(id)) ?? null;
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
