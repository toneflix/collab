<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">AI tools</h1>
        <p class="text-grey-5">
          Plans choose who gets the tools and how many credits come each month.
          Everyone with the tools can buy more credits.
        </p>
      </div>

      <q-spinner v-if="loading" />

      <q-form @submit="save" v-else-if="settings">
        <SettingsSections :sections="sections" :marked="unsaved">
          <template #general>
            <div class="toggle-card">
              <q-toggle color="toneflix" v-model="form.ai_enabled" />
              <div class="min-w-0">
                <div class="font-bold">AI tools in the studio</div>
                <div class="text-sm text-grey-5">
                  For people on plans that include them.
                </div>
              </div>
              <q-badge
                rounded
                :color="settings.client.enabled ? 'green-9' : 'grey-8'"
                :label="settings.client.enabled ? 'On' : 'Off'"
              />
            </div>
          </template>

          <template #engines>
            <p class="mb-3 text-sm text-grey-5">
              Keys go in the API's .env. Replicate runs every tool unless you
              switch Music generation or Stem splitting to Suno.
            </p>
            <div class="engines">
              <div class="engine">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold !flex-none">Replicate</span>
                  <q-badge
                    rounded
                    class="!flex-none"
                    :color="
                      settings.client.engines.replicate ? 'green-9' : 'grey-8'
                    "
                    :label="
                      settings.client.engines.replicate ? 'Ready' : 'No key'
                    "
                  />
                </div>
                <p class="mb-2 text-xs text-grey-5">
                  Music models, Demucs stems, Whisper lyrics and the AI
                  moderator. Create a token at replicate.com/account/api-tokens.
                </p>
                <EnvKeys :keys="settings.keys.replicate" />
              </div>
              <div class="engine">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold !flex-none">Suno</span>
                  <q-badge
                    rounded
                    class="!flex-none"
                    :color="settings.client.engines.suno ? 'green-9' : 'grey-8'"
                    :label="settings.client.engines.suno ? 'Ready' : 'No key'"
                  />
                </div>
                <p class="mb-2 text-xs text-grey-5">
                  Songs and stems through sunoapi.org, a reseller, not Suno
                  itself. Its terms don't say who owns what it makes. Get a key
                  at sunoapi.org/api-key.
                </p>
                <EnvKeys :keys="settings.keys.suno" />
              </div>
            </div>
          </template>

          <template #music>
            <p class="mb-3 text-sm text-grey-5">
              The studio generates music with this model. Each model has its own
              price in credits. Jobs already started keep the model and price
              they started with.
            </p>
            <div class="models">
              <label
                class="model"
                :class="{ 'model--on': form.ai_music_model === model.id }"
                :key="model.id"
                v-for="model in settings.models"
              >
                <q-radio
                  dense
                  dark
                  color="toneflix"
                  class="!flex-none"
                  :val="model.id"
                  v-model="form.ai_music_model"
                />
                <div class="min-w-0 model__body">
                  <div class="flex items-baseline gap-2">
                    <span class="font-bold !flex-none">{{ model.name }}</span>
                    <code class="text-xs text-grey-6 !flex-none">{{
                      model.id
                    }}</code>
                    <q-badge
                      rounded
                      color="orange-9"
                      class="!flex-none"
                      label="Needs its key"
                      v-if="!settings.client.engines[model.engine]"
                    />
                  </div>
                  <div class="text-sm text-grey-5">{{ model.description }}</div>
                  <div class="model__tags">
                    <q-chip
                      dense
                      square
                      dark
                      color="grey-9"
                      class="!flex-none"
                      :key="tag"
                      v-for="tag in modelTags(model)"
                      >{{ tag }}</q-chip
                    >
                  </div>
                  <q-input
                    dark
                    outlined
                    dense
                    type="number"
                    min="1"
                    class="model__credits"
                    :label="
                      model.pricing === 'per10s'
                        ? 'Credits per 10 seconds'
                        : 'Credits per song'
                    "
                    :hint="fields[model.creditsSetting]?.hint"
                    v-model.number="form.credits[model.creditsSetting]"
                  />
                  <div class="model__extra" v-if="model.engine === 'suno'">
                    <q-select
                      dark
                      outlined
                      dense
                      emit-value
                      map-options
                      class="model__credits"
                      :label="fields.ai_suno_model?.title"
                      :hint="fields.ai_suno_model?.hint"
                      :options="sunoVersions"
                      v-model="form.ai_suno_model"
                    />
                    <q-toggle
                      dark
                      color="toneflix"
                      :label="fields.ai_suno_keep_both?.title"
                      v-model="form.ai_suno_keep_both"
                    />
                    <div class="text-xs text-grey-5">
                      {{ fields.ai_suno_keep_both?.hint }}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </template>

          <template #stems>
            <p class="mb-3 text-sm text-grey-5">
              {{ fields.ai_stems_engine?.hint }} Jobs already started keep the
              engine and price they started with.
            </p>
            <div class="models">
              <label
                class="model"
                :class="{ 'model--on': form.ai_stems_engine === 'replicate' }"
              >
                <q-radio
                  dense
                  dark
                  color="toneflix"
                  class="!flex-none"
                  val="replicate"
                  v-model="form.ai_stems_engine"
                />
                <div class="min-w-0 model__body">
                  <div class="font-bold">Demucs on Replicate</div>
                  <div class="text-sm text-grey-5">
                    Vocals, drums, bass and other, as lossless parts that add up
                    to the song exactly.
                  </div>
                  <q-input
                    dark
                    outlined
                    dense
                    type="number"
                    min="1"
                    class="mt-3 model__credits"
                    label="Credits per split"
                    :hint="fields.ai_stems_credits?.hint"
                    v-model.number="form.ai_stems_credits"
                  />
                </div>
              </label>
              <label
                class="model"
                :class="{ 'model--on': form.ai_stems_engine === 'suno' }"
              >
                <q-radio
                  dense
                  dark
                  color="toneflix"
                  class="!flex-none"
                  val="suno"
                  v-model="form.ai_stems_engine"
                />
                <div class="min-w-0 model__body">
                  <div class="flex items-baseline gap-2">
                    <span class="font-bold !flex-none">Suno</span>
                    <q-badge
                      rounded
                      color="orange-9"
                      class="!flex-none"
                      label="Needs its key"
                      v-if="!settings.client.engines.suno"
                    />
                  </div>
                  <div class="text-sm text-grey-5">
                    Up to 12 parts, like backing vocals, guitar and synth. Songs
                    Suno made are split without uploading them again.
                  </div>
                  <div class="model__extra">
                    <q-select
                      dark
                      outlined
                      dense
                      emit-value
                      map-options
                      class="model__credits"
                      :label="fields.ai_stems_suno_type?.title"
                      :hint="fields.ai_stems_suno_type?.hint"
                      :options="sunoStemTypes"
                      v-model="form.ai_stems_suno_type"
                    />
                    <q-input
                      dark
                      outlined
                      dense
                      type="number"
                      min="1"
                      class="model__credits"
                      label="Credits per split"
                      :hint="fields.ai_stems_suno_credits?.hint"
                      v-model.number="form.ai_stems_suno_credits"
                    />
                  </div>
                </div>
              </label>
            </div>
          </template>

          <template #credits>
            <p class="mb-3 text-sm text-grey-5">
              A Demucs split costs us about $0.03, a 30 second ElevenLabs track
              about $0.08 and a Suno song about $0.06. The defaults sell a
              credit for about four times what it costs us.
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <q-input
                dark
                outlined
                type="number"
                min="0"
                step="0.001"
                :prefix="settings.currency"
                :label="fields.ai_credit_price?.title"
                :hint="fields.ai_credit_price?.hint"
                v-model.number="form.ai_credit_price"
              />
              <q-input
                dark
                outlined
                :label="fields.ai_credit_packs?.title"
                :hint="fields.ai_credit_packs?.hint"
                v-model="form.ai_credit_packs"
              />
              <q-input
                dark
                outlined
                type="number"
                min="10"
                max="300"
                :label="fields.ai_music_max_seconds?.title"
                :hint="fields.ai_music_max_seconds?.hint"
                v-model.number="form.ai_music_max_seconds"
              />
            </div>

            <div class="mt-4 text-sm" v-if="settings.client.packs.length">
              <div class="mb-1 text-grey-5">Packs on sale</div>
              <div class="flex flex-wrap gap-2">
                <q-chip
                  dark
                  square
                  class="!flex-none"
                  :key="pack.credits"
                  v-for="pack in settings.client.packs"
                >
                  {{ pack.credits.toLocaleString() }} credits ·
                  {{ price(pack.price)
                  }}<template v-if="pack.discount">
                    · {{ pack.discount }}% off</template
                  >
                </q-chip>
              </div>
            </div>
          </template>

          <template #lyrics>
            <p class="mb-3 text-sm text-grey-5">
              Whisper writes out lyrics for about $0.001 a track. Released
              tracks show synced lyrics in the player and can be found by their
              words. Explicit words mark a track explicit, and words to review
              send it to the moderation queue.
            </p>
            <div class="toggle-card mb-3">
              <q-toggle color="toneflix" v-model="form.ai_lyrics_auto" />
              <div class="min-w-0">
                <div class="font-bold">{{ fields.ai_lyrics_auto?.title }}</div>
                <div class="text-sm text-grey-5">
                  {{ fields.ai_lyrics_auto?.hint }}
                </div>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <q-input
                dark
                outlined
                type="number"
                min="1"
                :label="fields.ai_lyrics_credits?.title"
                :hint="fields.ai_lyrics_credits?.hint"
                v-model.number="form.ai_lyrics_credits"
              />
              <div class="max-sm:!hidden" />
              <q-input
                dark
                outlined
                autogrow
                :label="fields.ai_lyrics_explicit_words?.title"
                :hint="fields.ai_lyrics_explicit_words?.hint"
                v-model="form.ai_lyrics_explicit_words"
              />
              <q-input
                dark
                outlined
                autogrow
                :label="fields.ai_lyrics_review_words?.title"
                :hint="fields.ai_lyrics_review_words?.hint"
                v-model="form.ai_lyrics_review_words"
              />
            </div>
          </template>

          <template #tags>
            <p class="mb-3 text-sm text-grey-5">
              New tracks and studio mixes are tagged with their BPM and key,
              which show in the player, on track pages and in the studio, and
              can be searched. Creators can correct them. Run
              <code>php artisan tags:detect</code> once to tag older tracks.
            </p>
            <div class="toggle-card">
              <q-toggle color="toneflix" v-model="form.ai_tags_auto" />
              <div class="min-w-0">
                <div class="font-bold">{{ fields.ai_tags_auto?.title }}</div>
                <div class="text-sm text-grey-5">
                  {{ fields.ai_tags_auto?.hint }}
                </div>
              </div>
            </div>
          </template>

          <template #moderator>
            <p class="mb-3 text-sm text-grey-5">
              Reviews artist claims and releases waiting for approval. Admins
              can send any of them from the moderation queue, and those always
              get a decision. Items sent automatically are only decided when the
              moderator is confident enough; the rest stay in the queue, flagged
              for a person. It uses the Replicate token from Engines.
            </p>
            <div class="flex flex-col gap-3">
              <div
                class="toggle-card"
                :key="key"
                v-for="key in moderatorToggles"
              >
                <q-toggle color="toneflix" v-model="form[key]" />
                <div class="min-w-0">
                  <div class="font-bold">{{ fields[key]?.title }}</div>
                  <div class="text-sm text-grey-5">{{ fields[key]?.hint }}</div>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <q-input
                  dark
                  outlined
                  type="number"
                  min="0"
                  max="100"
                  suffix="%"
                  :label="fields.ai_moderator_confidence?.title"
                  :hint="fields.ai_moderator_confidence?.hint"
                  v-model.number="form.ai_moderator_confidence"
                />
              </div>
            </div>
          </template>

          <template #footer>
            <span class="text-sm text-grey-5" v-if="changed"
              >Unsaved changes</span
            >
            <q-btn
              unelevated
              rounded
              no-caps
              type="submit"
              color="toneflix"
              label="Save"
              class="!flex-none"
              :loading="saving"
              :disable="!changed"
            />
          </template>
        </SettingsSections>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import SettingsSections, {
  type SettingsSection,
} from 'src/components/Admin/SettingsSections.vue';
import EnvKeys from 'src/components/Utilities/EnvKeys.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import {
  loadAiSettingsRequest,
  saveAiSettingsRequest,
  type AiAdminSettings,
  type MusicModel,
} from 'src/utils/requests/ai';

const { price } = usePayments();

const loading = ref(true);
const saving = ref(false);
const settings = ref<AiAdminSettings>();
const form = reactive({
  ai_enabled: false,
  ai_credit_price: 0 as number | string,
  ai_credit_packs: '',
  ai_music_model: '',
  credits: {} as Record<string, number | string>,
  ai_suno_model: 'V5_5',
  ai_suno_keep_both: false,
  ai_stems_engine: 'replicate',
  ai_stems_credits: 5 as number | string,
  ai_stems_suno_type: 'split_stem',
  ai_stems_suno_credits: 50 as number | string,
  ai_music_max_seconds: 300 as number | string,
  ai_lyrics_auto: true,
  ai_lyrics_credits: 2 as number | string,
  ai_lyrics_explicit_words: '',
  ai_lyrics_review_words: '',
  ai_tags_auto: true,
  ai_moderator_claims_auto: false,
  ai_moderator_releases_auto: false,
  ai_moderator_confidence: 80 as number | string,
});

const moderatorToggles = [
  'ai_moderator_claims_auto',
  'ai_moderator_releases_auto',
] as const;

type FormKey = keyof typeof form;

/** The page's sections and the form fields each one holds. */
const sections: (SettingsSection & { fields: FormKey[] })[] = [
  {
    key: 'general',
    icon: 'fas fa-power-off',
    title: 'Availability',
    caption: 'Whether the studio offers AI tools.',
    fields: ['ai_enabled'],
  },
  {
    key: 'engines',
    icon: 'fas fa-plug',
    title: 'Engines',
    caption: 'Replicate and Suno, and the keys they need.',
    fields: [],
    hideFooter: true,
  },
  {
    key: 'music',
    icon: 'fas fa-music',
    title: 'Music generation',
    caption: 'The model songs are made with, and its price.',
    fields: ['ai_music_model', 'credits', 'ai_suno_model', 'ai_suno_keep_both'],
  },
  {
    key: 'stems',
    icon: 'fas fa-layer-group',
    title: 'Stem splitting',
    caption: 'Demucs or Suno, and what a split costs.',
    fields: [
      'ai_stems_engine',
      'ai_stems_credits',
      'ai_stems_suno_type',
      'ai_stems_suno_credits',
    ],
  },
  {
    key: 'credits',
    icon: 'fas fa-coins',
    title: 'Credits',
    caption: 'Credit price, packs and the longest song.',
    fields: ['ai_credit_price', 'ai_credit_packs', 'ai_music_max_seconds'],
  },
  {
    key: 'lyrics',
    icon: 'fas fa-align-left',
    title: 'Lyrics',
    caption: 'Transcription and the words that flag a track.',
    fields: [
      'ai_lyrics_auto',
      'ai_lyrics_credits',
      'ai_lyrics_explicit_words',
      'ai_lyrics_review_words',
    ],
  },
  {
    key: 'tags',
    icon: 'fas fa-gauge',
    title: 'Tempo and key',
    caption: 'BPM and key tags on new tracks.',
    fields: ['ai_tags_auto'],
  },
  {
    key: 'moderator',
    icon: 'fas fa-robot',
    title: 'AI moderator',
    caption: 'Automatic reviews of claims and releases.',
    fields: [
      'ai_moderator_claims_auto',
      'ai_moderator_releases_auto',
      'ai_moderator_confidence',
    ],
  },
];

const saved = ref<Partial<typeof form>>({});

const fields = computed(() => settings.value?.fields ?? {});
const differs = (key: FormKey) =>
  JSON.stringify(form[key]) !== JSON.stringify(saved.value[key]);
const changed = computed(() => (Object.keys(form) as FormKey[]).some(differs));
const unsaved = computed(() =>
  sections
    .filter((section) => section.fields.some(differs))
    .map((section) => section.key),
);

const toOptions = (map?: Record<string, string>) =>
  Object.entries(map ?? {}).map(([value, label]) => ({ value, label }));
const sunoVersions = computed(() =>
  toOptions(settings.value?.options.sunoVersions),
);
const sunoStemTypes = computed(() =>
  toOptions(settings.value?.options.sunoStemTypes),
);

const fill = (data: AiAdminSettings) => {
  settings.value = data;
  const f = data.fields;
  form.ai_enabled = f.ai_enabled?.value === '1';
  form.ai_credit_price = Number(f.ai_credit_price?.value ?? 0);
  form.ai_credit_packs = f.ai_credit_packs?.value ?? '';
  form.ai_music_model = f.ai_music_model?.value ?? data.client.music.id;
  form.credits = Object.fromEntries(
    data.models.map((m) => [
      m.creditsSetting,
      Number(f[m.creditsSetting]?.value ?? m.credits),
    ]),
  );
  form.ai_suno_model = f.ai_suno_model?.value ?? 'V5_5';
  form.ai_suno_keep_both = f.ai_suno_keep_both?.value === '1';
  form.ai_stems_engine = f.ai_stems_engine?.value ?? 'replicate';
  form.ai_stems_credits = Number(f.ai_stems_credits?.value ?? 5);
  form.ai_stems_suno_type = f.ai_stems_suno_type?.value ?? 'split_stem';
  form.ai_stems_suno_credits = Number(f.ai_stems_suno_credits?.value ?? 50);
  form.ai_music_max_seconds = Number(f.ai_music_max_seconds?.value ?? 300);
  form.ai_lyrics_auto = f.ai_lyrics_auto?.value === '1';
  form.ai_lyrics_credits = Number(f.ai_lyrics_credits?.value ?? 2);
  form.ai_lyrics_explicit_words = f.ai_lyrics_explicit_words?.value ?? '';
  form.ai_lyrics_review_words = f.ai_lyrics_review_words?.value ?? '';
  form.ai_tags_auto = f.ai_tags_auto?.value === '1';
  form.ai_moderator_claims_auto = f.ai_moderator_claims_auto?.value === '1';
  form.ai_moderator_releases_auto = f.ai_moderator_releases_auto?.value === '1';
  form.ai_moderator_confidence = Number(f.ai_moderator_confidence?.value ?? 80);
  saved.value = JSON.parse(JSON.stringify(form));
};

/** What a model can do, in a few words. */
const modelTags = (model: MusicModel) =>
  [
    model.maxSeconds
      ? `Up to ${Math.round(model.maxSeconds / 6) / 10} min`
      : 'Model picks the length',
    model.lyricsLength ? 'Sings your lyrics' : null,
    model.instrumentalOnly ? 'Instrumental only' : null,
    model.instrumentalOption ? 'Vocals or instrumental' : null,
    model.references.length ? 'Reference audio' : null,
  ].filter((tag): tag is string => !!tag);

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const save = async () => {
  saving.value = true;
  try {
    const { credits, ...rest } = form;
    const body = await saveAiSettingsRequest({ ...rest, ...credits }).send();
    fill(body.data);
    notify(body.message, 'success');
  } catch (e) {
    notify(errorText(e, "The settings couldn't be saved."), 'error');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    fill(await loadAiSettingsRequest().send());
  } catch (e) {
    notify(errorText(e, "The AI settings couldn't be loaded."), 'error');
  } finally {
    loading.value = false;
  }
});

useMeta(() => ({
  title: 'AI tools',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>

<style lang="scss" scoped>
.toggle-card {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);

  > :first-child,
  > :last-child {
    flex: none;
  }

  > .min-w-0 {
    flex: 1 1 auto;
  }
}

.models {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.model {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;

  &--on {
    border-color: rgba(3, 191, 255, 0.55);
    background: rgba(3, 191, 255, 0.06);
  }

  &__body {
    flex: 1 1 auto;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 6px 0 10px;

    .q-chip {
      margin: 0;
      font-size: 11px;
    }
  }

  &__credits {
    max-width: 320px;
  }

  &__extra {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }
}

.engines {
  display: grid;
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
}

.engine {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}
</style>
