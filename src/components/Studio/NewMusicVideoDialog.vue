<template>
  <q-dialog v-model="open" @show="reset">
    <q-card dark class="video-dialog flex-none!" style="width: 520px; max-width: 100vw">
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">New music video</div>
          <div class="text-xs text-grey-5">
            AI plans the shots on the beat and draws a still for each one. You check the storyboard before the video is
            made.
          </div>
        </div>
        <IconBtn icon="lucide-x" class="flex-none! ml-auto" aria-label="Close" v-close-popup />
      </header>

      <div class="px-4 pb-4 text-sm text-grey-5" v-if="!ai.access">
        With Premium, AI can make music videos for your songs.
        <router-link :to="{ name: 'premium' }">See plans</router-link>
      </div>

      <q-form class="flex flex-col gap-3 px-4 pb-2" @submit.prevent="next" v-else>
        <template v-if="step === 1">
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
            <q-toggle
              dark
              dense
              color="toneflix"
              class="mb-1"
              label="I have character sheets"
              v-model="form.useSheets"
            />
            <div class="mb-3 text-xs text-grey-6">
              {{
                form.useSheets
                  ? 'Add your sheets in the next step. AI uses them as they are and draws none of its own.'
                  : 'Without sheets, AI draws one for each character in the video.'
              }}
            </div>
            <template v-if="!form.useSheets">
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
              <div class="mt-1 text-xs text-negative" v-if="errors.consent">
                {{ errors.consent }}
              </div>
            </template>
          </div>
        </template>

        <!-- Step 2: the creator's own character sheets -->
        <template v-else>
          <div class="text-xs text-grey-5">
            Add a sheet for each person who appears, up to {{ MAX_SHEETS }}, and mark the singer. AI casts only these
            characters.
          </div>
          <div class="sheet-row" :key="sheet.id" v-for="(sheet, i) in sheets">
            <div class="flex items-start gap-3 no-wrap">
              <label class="sheet-pick flex-none!">
                <img :src="sheet.preview" alt="" v-if="sheet.preview" />
                <q-icon name="lucide-image-plus" size="22px" class="text-grey-6" v-else />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="pick(sheet, $event)"
                />
              </label>
              <div class="flex flex-col flex-1 min-w-0 gap-2">
                <q-input dark filled dense maxlength="80" label="Name" v-model="sheet.name" />
                <q-input
                  dark
                  filled
                  dense
                  autogrow
                  maxlength="600"
                  label="Who they are (optional)"
                  placeholder="The singer's younger brother"
                  v-model="sheet.description"
                />
                <div class="flex items-center justify-between no-wrap">
                  <q-radio dark dense color="toneflix" label="Singer" :val="sheet.id" v-model="singer" />
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="lucide-trash-2"
                    class="flex-none!"
                    aria-label="Remove this sheet"
                    @click="sheets.splice(i, 1)"
                    v-if="sheets.length > 1"
                  />
                </div>
              </div>
            </div>
          </div>
          <q-btn
            flat
            rounded
            no-caps
            icon="lucide-plus"
            label="Add a sheet"
            class="self-start flex-none!"
            @click="addSheet"
            v-if="sheets.length < MAX_SHEETS"
          />
          <q-checkbox
            dark
            dense
            color="toneflix"
            label="These images are of me or people who agreed, or I have the right to use them"
            v-model="form.consent"
          />
          <div class="text-xs text-negative" v-if="sheetError">
            {{ sheetError }}
          </div>
        </template>

        <div class="flex items-center justify-between gap-3 py-2 no-wrap">
          <q-btn flat rounded no-caps label="Back" class="flex-none!" @click="step = 1" v-if="step === 2" />
          <div class="text-xs text-grey-6" v-else>
            <template v-if="track">Storyboard: {{ storyboardCost }} credits · </template
            >{{ ai.balance.total.toLocaleString() }} left
            <template v-if="short">
              ·
              <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
            </template>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            text-color="dark"
            :icon="needsSheets ? 'lucide-arrow-right' : 'lucide-clapperboard'"
            class="flex-none!"
            :label="needsSheets ? 'Add character sheets' : 'Plan the video'"
            :loading="saving"
            :disable="!ready"
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

const ratioOptions = VIDEO_RATIOS.map((r) => ({
  label: `${r.label} ${r.value}`,
  value: r.value,
  icon: r.icon,
}));

const track = ref<Track | null>(null);
const tracks = ref<Track[]>([]);
const searching = ref(false);
const saving = ref(false);
const errors = ref<Record<string, string>>({});

const form = reactive({
  ratio: '16:9' as VideoRatio,
  brief: '',
  photo: null as File | null,
  useSheets: false,
  consent: false,
});

/** Character sheets a creator may bring */
const MAX_SHEETS = 4;

type SheetRow = {
  id: number;
  name: string;
  description: string;
  file: File | null;
  preview: string | null;
};

const step = ref<1 | 2>(1);
const sheets = ref<SheetRow[]>([]);
const singer = ref<number | null>(null);
let rowId = 0;

const addSheet = () => {
  const row = {
    id: ++rowId,
    name: '',
    description: '',
    file: null,
    preview: null,
  };
  sheets.value.push(row);
  singer.value ??= row.id;
};

const pick = (sheet: SheetRow, event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (sheet.preview) URL.revokeObjectURL(sheet.preview);
  sheet.file = file;
  sheet.preview = URL.createObjectURL(file);
  if (!sheet.name.trim()) sheet.name = sheet.id === singer.value ? 'The singer' : '';
};

/** Step one goes on to the sheets when the creator brings their own */
const needsSheets = computed(() => step.value === 1 && props.ownPhotos && form.useSheets);
const sheetsReady = computed(
  () =>
    sheets.value.length > 0 &&
    sheets.value.every((sheet) => sheet.file && sheet.name.trim()) &&
    sheets.value.some((sheet) => sheet.id === singer.value) &&
    form.consent,
);
const ready = computed(() => {
  if (!track.value || short.value) return false;
  if (step.value === 2) return sheetsReady.value;
  return needsSheets.value || !form.photo || form.consent;
});
const sheetError = computed(
  () => Object.entries(errors.value).find(([key]) => key.startsWith('characters') || key === 'consent')?.[1] ?? '',
);

const minutes = computed(() => Math.max(1, Math.ceil((track.value?.duration ?? 60) / 60)));
const storyboardCost = computed(() => (props.ai.costs.videoStoryboard ?? 0) * minutes.value);
const short = computed(() => !!track.value && props.ai.balance.total < storyboardCost.value);

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

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
  form.useSheets = false;
  form.consent = false;
  step.value = 1;
  sheets.value.forEach((sheet) => sheet.preview && URL.revokeObjectURL(sheet.preview));
  sheets.value = [];
  singer.value = null;
};

const next = () => {
  if (!needsSheets.value) return void submit();
  if (!sheets.value.length) addSheet();
  form.consent = false;
  step.value = 2;
};

const submit = async () => {
  if (!track.value) return;
  saving.value = true;
  errors.value = {};
  try {
    const characters =
      step.value === 2
        ? sheets.value.map((sheet) => ({
            name: sheet.name.trim(),
            description: sheet.description.trim() || undefined,
            singer: sheet.id === singer.value,
            sheet: sheet.file as File,
          }))
        : undefined;
    const res = await createMusicVideoRequest(String(track.value.slug), {
      ratio: form.ratio,
      brief: form.brief.trim(),
      photo: step.value === 2 ? null : form.photo,
      characters,
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

.sheet-row {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.sheet-pick {
  display: grid;
  place-items: center;
  width: 112px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  cursor: pointer;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.photo-box {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
