<template>
  <q-dialog v-model="open" @show="reset">
    <q-card
      dark
      class="video-dialog flex-none!"
      style="width: 520px; max-width: 100vw"
    >
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">New music video</div>
          <div class="text-xs text-grey-5">{{ intro }}</div>
        </div>
        <IconBtn
          icon="lucide-x"
          class="flex-none! ml-auto"
          aria-label="Close"
          v-close-popup
        />
      </header>

      <div class="px-4 pb-4 text-sm text-grey-5" v-if="!ai.access">
        With Premium, AI can make music videos for your songs.
        <router-link :to="{ name: 'premium' }">See plans</router-link>
      </div>

      <q-form
        class="flex flex-col gap-3 px-4 pb-2"
        @submit.prevent="next"
        v-else
      >
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
                    <template v-if="scope.opt.duration">
                      · {{ clock(scope.opt.duration) }}</template
                    >
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-6"
                  >None of your songs match that.</q-item-section
                >
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

          <div>
            <div class="mb-1 text-xs text-grey-5">Style</div>
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
              :options="modeOptions"
              v-model="form.mode"
            />
            <div class="mt-1 text-xs text-grey-6">{{ modeCaption }}</div>
          </div>

          <div>
            <div class="mb-1 text-xs text-grey-5">Lyrics</div>
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
              :options="lyricOptions"
              v-model="form.lyrics"
            />
            <div class="mt-1 text-xs text-negative" v-if="errors.lyrics">
              {{ errors.lyrics }}
            </div>
          </div>

          <div v-if="advanced && !lyricVideo">
            <div class="mb-1 text-xs text-grey-5">Quality</div>
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
              :options="qualityOptions"
              v-model="form.quality"
            />
            <div class="mt-1 text-xs text-grey-6">{{ qualityCaption }}</div>
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
            v-if="!lyricVideo"
          />

          <div
            class="photo-box"
            v-if="(castOptions.length > 1 || ownPhotos) && !lyricVideo"
          >
            <div class="mb-1 text-xs text-grey-5">Cast</div>
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
              :options="castOptions"
              v-model="form.cast"
              v-if="castOptions.length > 1"
            />
            <div class="mt-1 mb-3 text-xs text-grey-6">{{ castCaption }}</div>

            <div
              class="grid grid-cols-3 gap-2 mb-3"
              v-if="form.cast === 'saved'"
            >
              <div
                class="pick"
                :class="{
                  'pick--on': picked(character),
                  'pick--off': !castable(character),
                }"
                :key="character.id"
                v-for="character in library"
              >
                <button
                  type="button"
                  class="pick__sheet"
                  :aria-pressed="picked(character)"
                  :disabled="!castable(character)"
                  @click="togglePick(character)"
                >
                  <img :src="character.sheetUrl" alt="" loading="lazy" />
                  <q-icon
                    name="lucide-circle-check"
                    size="18px"
                    class="pick__check"
                    v-if="picked(character)"
                  />
                </button>
                <div class="flex items-center gap-1 px-2 py-1 min-h-9 no-wrap">
                  <span class="text-xs truncate flex-1">{{
                    character.name
                  }}</span>
                  <IconBtn
                    size="sm"
                    icon="lucide-mic-vocal"
                    class="flex-none!"
                    :color="
                      singerPick === character.id ? 'toneflix' : undefined
                    "
                    :active="singerPick === character.id"
                    :aria-label="`${character.name} is the singer`"
                    tooltip="The singer"
                    @click="toggleSinger(character)"
                    v-if="picked(character)"
                  />
                </div>
              </div>
            </div>
            <div class="mb-3 text-xs text-negative" v-if="tooManyPicks">
              Mark the singer, or pick at most {{ MAX_SHEETS - 1 }} so AI can
              add one.
            </div>

            <template v-if="showPhoto">
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
            <div class="text-xs text-negative" v-if="errors.saved">
              {{ errors.saved }}
            </div>
          </div>
        </template>

        <!-- Step 2: the creator's own character sheets -->
        <template v-else>
          <div class="text-xs text-grey-5">
            Add a sheet for each person who appears, up to {{ MAX_SHEETS }}, and
            mark the singer. AI casts only these characters.
          </div>
          <div class="sheet-row" :key="sheet.id" v-for="(sheet, i) in sheets">
            <div class="flex items-start gap-3 no-wrap">
              <label class="sheet-pick flex-none!">
                <img :src="sheet.preview" alt="" v-if="sheet.preview" />
                <q-icon
                  name="lucide-image-plus"
                  size="22px"
                  class="text-grey-6"
                  v-else
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="pick(sheet, $event)"
                />
              </label>
              <div class="flex flex-col flex-1 min-w-0 gap-2">
                <q-input
                  dark
                  filled
                  dense
                  maxlength="80"
                  label="Name"
                  v-model="sheet.name"
                />
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
                  <q-radio
                    dark
                    dense
                    color="toneflix"
                    label="Singer"
                    :val="sheet.id"
                    v-model="singer"
                  />
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
          <q-btn
            flat
            rounded
            no-caps
            label="Back"
            class="flex-none!"
            @click="step = 1"
            v-if="step === 2"
          />
          <div class="text-xs text-grey-6" v-else>
            <template v-if="lyricVideo">Free</template>
            <template v-else>
              <template v-if="track"
                >Storyboard: {{ storyboardCost }} credits · </template
              >{{ ai.balance.total.toLocaleString() }} left
            </template>
            <template v-if="short">
              ·
              <router-link :to="{ name: 'studio.credits' }"
                >Get credits</router-link
              >
            </template>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            text-color="dark"
            :icon="submitIcon"
            class="flex-none!"
            :label="submitLabel"
            :loading="saving"
            :disable="!ready"
          />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { notifyError } from 'src/utils/composer';
import type { Track } from 'src/utils/models';
import type { AiAccount } from 'src/utils/requests/ai';
import {
  createMusicVideoRequest,
  loadOwnTracksRequest,
  loadSavedCharactersRequest,
  LYRIC_STYLES,
  minuteRate,
  renderRate,
  storyboardRate,
  VIDEO_MODES,
  VIDEO_QUALITIES,
  VIDEO_RATIOS,
  type LyricStyle,
  type MusicVideo,
  type SavedCharacter,
  type VideoMode,
  type VideoQuality,
  type VideoRatio,
} from 'src/utils/requests/videos';

const props = defineProps<{
  ai: AiAccount;
  /** Whether the plan lets people upload their own photo */
  ownPhotos: boolean;
  /** Whether the plan includes advanced videos */
  advanced?: boolean;
}>();

const emit = defineEmits<{ created: [video: MusicVideo] }>();

const open = defineModel<boolean>({ default: false });

const ratioOptions = VIDEO_RATIOS.map((r) => ({
  label: `${r.label} ${r.value}`,
  value: r.value,
  icon: r.icon,
}));

const modeOptions = VIDEO_MODES.map((m) => ({
  label: m.label,
  value: m.value,
}));
const qualityOptions = VIDEO_QUALITIES.map((q) => ({
  label: q.label,
  value: q.value,
}));

const track = ref<Track | null>(null);
const tracks = ref<Track[]>([]);
const searching = ref(false);
const saving = ref(false);
const errors = ref<Record<string, string>>({});

const form = reactive({
  ratio: '16:9' as VideoRatio,
  mode: 'locations' as VideoMode,
  quality: 'standard' as VideoQuality,
  brief: '',
  lyrics: 'off' as LyricStyle | 'off',
  photo: null as File | null,
  cast: 'ai' as CastSource,
  consent: false,
});

/** Where the video's characters come from */
type CastSource = 'ai' | 'saved' | 'sheets';

const library = ref<SavedCharacter[]>([]);
const picks = ref<number[]>([]);
const singerPick = ref<number | null>(null);

const castOptions = computed(() => [
  { label: 'AI draws', value: 'ai' },
  ...(library.value.length ? [{ label: 'My characters', value: 'saved' }] : []),
  ...(props.ownPhotos ? [{ label: 'My sheets', value: 'sheets' }] : []),
]);
const castCaption = computed(
  () =>
    ({
      ai: 'AI draws a character sheet for each person in the video.',
      saved: `Pick up to ${MAX_SHEETS} and mark the singer, or AI draws one.`,
      sheets:
        'Add your sheets in the next step. AI uses them as they are and draws none of its own.',
    })[form.cast],
);
/** The photo is for a singer AI draws */
const showPhoto = computed(
  () =>
    props.ownPhotos &&
    (form.cast === 'ai' || (form.cast === 'saved' && !singerPick.value)),
);
const tooManyPicks = computed(
  () =>
    form.cast === 'saved' &&
    !singerPick.value &&
    picks.value.length >= MAX_SHEETS,
);

/** Own uploads only go in videos on plans that take them */
const castable = (character: SavedCharacter) =>
  !character.uploaded || props.ownPhotos;
const picked = (character: SavedCharacter) =>
  picks.value.includes(character.id);

const togglePick = (character: SavedCharacter) => {
  if (picked(character)) {
    picks.value = picks.value.filter((id) => id !== character.id);
    if (singerPick.value === character.id) singerPick.value = null;
  } else if (picks.value.length < MAX_SHEETS) {
    picks.value.push(character.id);
  }
};

const toggleSinger = (character: SavedCharacter) => {
  singerPick.value = singerPick.value === character.id ? null : character.id;
};

const loadLibrary = () =>
  loadSavedCharactersRequest()
    .send()
    .then((res) => (library.value = res.data))
    .catch(() => (library.value = []));

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
  if (!sheet.name.trim())
    sheet.name = sheet.id === singer.value ? 'The singer' : '';
};

/** A lyric video shows the synced lyrics over the artwork, with no storyboard */
const lyricVideo = computed(() => form.mode === 'lyrics');

/** A lyric video always shows its lyrics; any other video may */
const lyricOptions = computed(() => [
  ...(lyricVideo.value ? [] : [{ label: 'Off', value: 'off' }]),
  ...LYRIC_STYLES.map((style) => ({ label: style.label, value: style.value })),
]);

const intro = computed(() =>
  lyricVideo.value
    ? 'Your synced lyrics, line by line, over the song artwork.'
    : 'AI plans the shots on the beat and draws a still for each one. You check the storyboard before the video is made.',
);

/** Step one goes on to the sheets when the creator brings their own */
const needsSheets = computed(
  () =>
    step.value === 1 &&
    props.ownPhotos &&
    form.cast === 'sheets' &&
    !lyricVideo.value,
);
const submitLabel = computed(() => {
  if (needsSheets.value) return 'Add character sheets';
  return lyricVideo.value ? 'Make the lyric video' : 'Plan the video';
});
const submitIcon = computed(() => {
  if (needsSheets.value) return 'lucide-arrow-right';
  return lyricVideo.value ? 'lucide-captions' : 'lucide-clapperboard';
});
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
  if (lyricVideo.value) return true;
  if (form.cast === 'saved' && (!picks.value.length || tooManyPicks.value))
    return false;
  return needsSheets.value || !showPhoto.value || !form.photo || form.consent;
});
const sheetError = computed(
  () =>
    Object.entries(errors.value).find(
      ([key]) => key.startsWith('characters') || key === 'consent',
    )?.[1] ?? '',
);

const minutes = computed(() =>
  Math.max(1, Math.ceil((track.value?.duration ?? 60) / 60)),
);
const storyboardCost = computed(() =>
  lyricVideo.value
    ? 0
    : storyboardRate(props.ai.costs, form.mode) * minutes.value,
);
const modeCaption = computed(
  () => VIDEO_MODES.find((m) => m.value === form.mode)?.caption ?? '',
);
/** The quality's caption with what rendering costs a minute */
const qualityCaption = computed(() => {
  const caption =
    VIDEO_QUALITIES.find((q) => q.value === form.quality)?.caption ?? '';
  const credits = renderRate(props.ai.costs, form.quality);
  const rate = minuteRate(props.ai.costs, form.quality);
  const minutes = rate > 1 ? ` or ${rate} video minutes` : '';
  return `${caption}. The video costs ${credits.toLocaleString()} credits${minutes} a minute.`;
});
const short = computed(
  () => !!track.value && props.ai.balance.total < storyboardCost.value,
);

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
  form.lyrics = form.mode === 'lyrics' ? 'captions' : 'off';
  if (!props.advanced) form.quality = 'standard';
  form.photo = null;
  form.cast = 'ai';
  form.consent = false;
  picks.value = [];
  singerPick.value = null;
  void loadLibrary();
  step.value = 1;
  sheets.value.forEach(
    (sheet) => sheet.preview && URL.revokeObjectURL(sheet.preview),
  );
  sheets.value = [];
  singer.value = null;
};

watch(
  () => form.mode,
  (mode) => {
    if (mode === 'lyrics' && form.lyrics === 'off') form.lyrics = 'captions';
  },
);

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
    const lyric = lyricVideo.value;
    const res = await createMusicVideoRequest(String(track.value.slug), {
      ratio: form.ratio,
      mode: form.mode,
      quality: props.advanced && !lyric ? form.quality : 'standard',
      brief: lyric ? '' : form.brief.trim(),
      lyrics: form.lyrics === 'off' ? null : form.lyrics,
      photo: step.value === 2 || lyric || !showPhoto.value ? null : form.photo,
      characters,
      saved:
        step.value === 1 && form.cast === 'saved' && !lyric
          ? picks.value.map((id) => ({ id, singer: id === singerPick.value }))
          : undefined,
      consent: form.consent,
    }).send();
    open.value = false;
    emit('created', res.data);
  } catch (e) {
    const err = e as { errors?: Record<string, string | string[]> };
    errors.value = Object.fromEntries(
      Object.entries(err.errors ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? (value[0] ?? '') : value,
      ]),
    );
    if (!Object.keys(errors.value).length)
      notifyError(e, "The video couldn't be started.");
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

.pick {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;

  &--on {
    border-color: var(--tf-primary);
  }

  &--off {
    opacity: 0.45;
  }

  &__sheet {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    padding: 0;
    border: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.04);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__check {
    position: absolute;
    top: 6px;
    right: 6px;
    color: var(--tf-primary);
  }
}

.photo-box {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
