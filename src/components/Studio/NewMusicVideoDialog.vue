<template>
  <q-dialog v-model="open" @show="reset">
    <q-card dark class="video-dialog flex-none!" style="width: 520px; max-width: 100vw">
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">New music video</div>
          <div class="text-xs text-grey-5">
            AI plans the shots on the beat and draws a still for each one. You check the storyboard before the video is made.
          </div>
        </div>
        <IconBtn icon="lucide-x" class="flex-none! ml-auto" aria-label="Close" v-close-popup />
      </header>

      <div class="px-4 pb-4 text-sm text-grey-5" v-if="!ai.access">
        With Premium, AI can make music videos for your songs.
        <router-link :to="{ name: 'premium' }">See plans</router-link>
      </div>

      <q-form class="flex flex-col gap-3 px-4 pb-2" @submit.prevent="submit" v-else>
        <q-select
          dark
          filled
          dense
          use-input
          hide-selected
          fill-input
          input-debounce="300"
          option-value="id"
          option-label="title"
          label="Song"
          :options="tracks"
          :loading="searching"
          :error="!!errors.track"
          :error-message="errors.track"
          @filter="findTracks"
          v-model="track"
        >
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <img :src="scope.opt.imageUrl" alt="" class="track-art" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.opt.title }}</q-item-label>
                <q-item-label caption>
                  {{ scope.opt.release?.title }}
                  <template v-if="scope.opt.duration"> · {{ clock(scope.opt.duration) }}</template>
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey-6">None of your songs match that.</q-item-section>
            </q-item>
          </template>
        </q-select>

        <div>
          <div class="mb-1 text-xs text-grey-5">Shape</div>
          <q-btn-toggle
            dark
            spread
            no-caps
            rounded
            unelevated
            toggle-color="toneflix"
            toggle-text-color="dark"
            color="transparent"
            dense
            class="ratio-toggle w-full"
            :options="ratioOptions"
            v-model="form.ratio"
          />
        </div>

        <q-input
          dark
          filled
          dense
          autogrow
          counter
          maxlength="1000"
          label="Ideas for the video (optional)"
          placeholder="Night drive through a neon city, the singer in a red jacket"
          :error="!!errors.brief"
          :error-message="errors.brief"
          v-model="form.brief"
        />

        <div class="photo-box" v-if="ownPhotos">
          <q-file
            dark
            filled
            dense
            clearable
            accept="image/jpeg,image/png,image/webp"
            max-file-size="10485760"
            label="A photo of the singer (optional)"
            hint="A clear, front-facing photo. Without one, AI draws a singer that fits the song."
            :error="!!errors.photo"
            :error-message="errors.photo"
            v-model="form.photo"
          >
            <template #prepend>
              <q-icon name="lucide-image-plus" />
            </template>
          </q-file>
          <q-checkbox
            dark
            dense
            color="toneflix"
            class="mt-3"
            label="This photo is of me, or I have the right to use it"
            v-model="form.consent"
            v-if="form.photo"
          />
          <div class="mt-1 text-xs text-negative" v-if="errors.consent">{{ errors.consent }}</div>
        </div>

        <div class="flex items-center justify-between gap-3 py-2 no-wrap">
          <div class="text-xs text-grey-6">
            <template v-if="track">Storyboard: {{ storyboardCost }} credits · </template>{{ ai.balance.total.toLocaleString() }} left
            <template v-if="short">
              · <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
            </template>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            text-color="dark"
            icon="lucide-clapperboard"
            class="flex-none!"
            label="Plan the video"
            :loading="saving"
            :disable="!track || short || (!!form.photo && !form.consent)"
          />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { notifyError } from 'src/utils/composer';
import type { Track } from 'src/utils/models';
import type { AiAccount } from 'src/utils/requests/ai';
import {
  createMusicVideoRequest,
  loadOwnTracksRequest,
  VIDEO_RATIOS,
  type MusicVideo,
  type VideoRatio,
} from 'src/utils/requests/videos';

const props = defineProps<{
  ai: AiAccount;
  /** Whether the plan lets people upload their own photo */
  ownPhotos: boolean;
}>();

const emit = defineEmits<{ created: [video: MusicVideo] }>();

const open = defineModel<boolean>({ default: false });

const ratioOptions = VIDEO_RATIOS.map((r) => ({ label: `${r.label} ${r.value}`, value: r.value, icon: r.icon }));

const track = ref<Track | null>(null);
const tracks = ref<Track[]>([]);
const searching = ref(false);
const saving = ref(false);
const errors = ref<Record<string, string>>({});

const form = reactive({
  ratio: '16:9' as VideoRatio,
  brief: '',
  photo: null as File | null,
  consent: false,
});

const minutes = computed(() => Math.max(1, Math.ceil((track.value?.duration ?? 60) / 60)));
const storyboardCost = computed(() => (props.ai.costs.videoStoryboard ?? 0) * minutes.value);
const short = computed(() => !!track.value && props.ai.balance.total < storyboardCost.value);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

/** Loads the creator's songs, filtered by what they type */
const findTracks = (search: string, done: (fn: () => void) => void) => {
  searching.value = true;
  loadOwnTracksRequest(search.trim())
    .send()
    .then((res) => done(() => (tracks.value = res.data)))
    .catch((e) => {
      done(() => (tracks.value = []));
      notifyError(e, "Your songs couldn't be loaded.");
    })
    .finally(() => (searching.value = false));
};

const reset = () => {
  errors.value = {};
  form.photo = null;
  form.consent = false;
};

const submit = async () => {
  if (!track.value) return;
  saving.value = true;
  errors.value = {};
  try {
    const res = await createMusicVideoRequest(String(track.value.slug), {
      ratio: form.ratio,
      brief: form.brief.trim(),
      photo: form.photo,
      consent: form.consent,
    }).send();
    open.value = false;
    emit('created', res.data);
  } catch (e) {
    const err = e as { errors?: Record<string, string | string[]> };
    errors.value = Object.fromEntries(
      Object.entries(err.errors ?? {}).map(([key, value]) => [key, Array.isArray(value) ? (value[0] ?? '') : value]),
    );
    if (!Object.keys(errors.value).length) notifyError(e, "The video couldn't be started.");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.video-dialog {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
}

.ratio-toggle {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.track-art {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
}

.photo-box {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
