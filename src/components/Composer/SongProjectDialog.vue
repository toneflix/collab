<template>
  <q-dialog v-model="open" @show="reset">
    <q-card dark class="project-dialog !flex-none" style="width: 480px; max-width: 100vw">
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">Make a project from this song</div>
          <div class="text-xs text-grey-5">
            You get a project with one track, and the lyrics go on its lyric sheet.
          </div>
        </div>
        <q-btn flat round dense icon="close" class="!flex-none ml-auto" aria-label="Close" v-close-popup />
      </header>

      <q-form class="flex flex-col gap-3 px-4 pb-2" @submit.prevent="submit">
        <q-input
          dark
          filled
          dense
          maxlength="150"
          label="Project name"
          :error="!!errors.title"
          :error-message="errors.title"
          v-model="form.title"
        />
        <q-select
          dark
          filled
          dense
          emit-value
          map-options
          option-value="id"
          option-label="title"
          label="Genre"
          :options="genres"
          :error="!!errors.genre_id"
          :error-message="errors.genre_id"
          v-model="form.genreId"
        />
        <UserSearchInput
          dark
          filled
          dense
          allow-create
          label="Artist"
          :error="!!errors.artist_id"
          :error-message="errors.artist_id"
          :params="{ user_id: userId }"
          v-model="artist"
          @selected="(e) => (form.artistId = Number(e.id))"
        />
        <q-select
          dark
          filled
          dense
          emit-value
          map-options
          label="Who can see the project"
          :options="privacyOptions"
          v-model="form.privacy"
        />

        <div class="ai-box" v-if="ai?.enabled">
          <q-checkbox
            dark
            dense
            color="toneflix"
            label="Have AI sing it on the track"
            :disable="!ai.access"
            v-model="form.generate"
          />
          <div class="mt-1 text-xs text-grey-5" v-if="!ai.access">
            With Premium, AI can turn your lyrics into a song.
            <router-link :to="{ name: 'premium' }">See plans</router-link>
          </div>
          <template v-else-if="form.generate">
            <q-input
              dark
              filled
              dense
              autogrow
              maxlength="2000"
              class="mt-2"
              label="Describe the sound"
              placeholder="Moody synth pop, female vocals, 92 BPM"
              :error="!!errors.prompt || !!errors.generate"
              :error-message="errors.prompt || errors.generate"
              v-model="form.prompt"
            />
            <div class="text-xs text-grey-6">
              Uses your credits ({{ ai.balance.total }} left). The song shows up on the track when it's ready.
            </div>
          </template>
        </div>
        <div class="text-xs text-negative" v-if="errors.song">{{ errors.song }}</div>

        <div class="flex justify-end gap-2 py-2 no-wrap">
          <q-btn flat rounded no-caps class="!flex-none" label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            text-color="dark"
            class="!flex-none"
            label="Make project"
            :loading="saving"
            :disable="!form.genreId || !form.artistId || (form.generate && !form.prompt.trim())"
          />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import UserSearchInput from 'src/components/Utilities/UserSearchInput.vue';
import { useGenres } from 'src/composables/useGenres';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import type { BaseOption, User } from 'src/utils/models';
import type { AiAccount } from 'src/utils/requests/ai';
import { songProjectRequest, type Song } from 'src/utils/requests/composer';

const props = defineProps<{
  song: Song;
  ai?: AiAccount | null;
  /** Saves anything waiting first, so the newest lyrics go on the sheet */
  flush: () => Promise<void>;
}>();

const emit = defineEmits<{ created: [song: Song] }>();

const open = defineModel<boolean>({ default: false });

const { genres } = useGenres();
const boot = useBootstrapStore();
const userId = computed(() => Number(boot.user?.id ?? 0));

const privacyOptions = [
  { label: 'Only me and collaborators', value: 'private' },
  { label: 'Everyone, as a preview', value: 'public_preview' },
  { label: 'Everyone', value: 'public' },
];

const form = reactive({
  title: '',
  genreId: null as number | null,
  artistId: null as number | null,
  privacy: 'private' as 'private' | 'public' | 'public_preview',
  generate: false,
  prompt: '',
});
const artist = ref<(User & BaseOption) | null>(null);
const errors = ref<Record<string, string>>({});
const saving = ref(false);

const reset = () => {
  form.title = props.song.title;
  form.prompt = form.prompt || [props.song.settings.mood, props.song.bpm ? `${props.song.bpm} BPM` : ''].filter(Boolean).join(', ');
  errors.value = {};
};

const submit = async () => {
  if (!form.genreId || !form.artistId) return;
  saving.value = true;
  errors.value = {};
  try {
    await props.flush();
    const res = await songProjectRequest(props.song.id, {
      title: form.title.trim() || undefined,
      privacy: form.privacy,
      genre_id: form.genreId,
      artist_id: form.artistId,
      generate: form.generate || undefined,
      prompt: form.generate ? form.prompt.trim() : undefined,
    }).send();
    notify(res.message, 'success');
    open.value = false;
    emit('created', res.data);
  } catch (e) {
    const err = e as { errors?: Record<string, string | string[]>; message?: string };
    errors.value = Object.fromEntries(
      Object.entries(err.errors ?? {}).map(([key, value]) => [key, Array.isArray(value) ? (value[0] ?? '') : value]),
    );
    if (!Object.keys(errors.value).length) notifyError(e, "The project couldn't be made.");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.project-dialog {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
}

.ai-box {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
