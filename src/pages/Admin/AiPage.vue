<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">AI tools</h1>
        <p class="text-grey-5">
          Music generation with ElevenLabs Music, stem splitting with Demucs and
          lyrics with Whisper, all run on Replicate. Plans choose who gets the tools and how many
          credits come each month. Everyone with the tools can buy more credits.
        </p>
      </div>

      <q-spinner v-if="loading" />

      <q-form class="flex flex-col gap-4" @submit="save" v-else-if="settings">
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

        <div class="section">
          <div class="mb-1 font-bold">Replicate</div>
          <p class="mb-3 text-sm text-grey-5">
            Create a token at replicate.com/account/api-tokens and put it in the
            API's .env.
          </p>
          <EnvKeys :keys="settings.keys.replicate" />
        </div>

        <div class="section">
          <div class="mb-1 font-bold">Credits</div>
          <p class="mb-3 text-sm text-grey-5">
            Generating a 30 second track costs us about $0.08 and a split about
            $0.01. The defaults sell a credit for about four times what it costs
            us.
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
              min="1"
              :label="fields.ai_music_credits?.title"
              :hint="fields.ai_music_credits?.hint"
              v-model.number="form.ai_music_credits"
            />
            <q-input
              dark
              outlined
              type="number"
              min="1"
              :label="fields.ai_stems_credits?.title"
              :hint="fields.ai_stems_credits?.hint"
              v-model.number="form.ai_stems_credits"
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
        </div>

        <div class="section">
          <div class="mb-1 font-bold">Lyrics</div>
          <p class="mb-3 text-sm text-grey-5">
            Whisper writes out lyrics for about $0.001 a track. Released tracks
            show synced lyrics in the player and can be found by their words.
            Explicit words mark a track explicit, and words to review send it to
            the moderation queue.
          </p>
          <div class="toggle-card mb-3">
            <q-toggle color="toneflix" v-model="form.ai_lyrics_auto" />
            <div class="min-w-0">
              <div class="font-bold">{{ fields.ai_lyrics_auto?.title }}</div>
              <div class="text-sm text-grey-5">{{ fields.ai_lyrics_auto?.hint }}</div>
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
        </div>

        <div class="section">
          <div class="mb-1 font-bold">Tempo and key</div>
          <p class="mb-3 text-sm text-grey-5">
            New tracks and studio mixes are tagged with their BPM and key, which
            show in the player, on track pages and in the studio, and can be
            searched. Creators can correct them. Run
            <code>php artisan tags:detect</code> once to tag older tracks.
          </p>
          <div class="toggle-card">
            <q-toggle color="toneflix" v-model="form.ai_tags_auto" />
            <div class="min-w-0">
              <div class="font-bold">{{ fields.ai_tags_auto?.title }}</div>
              <div class="text-sm text-grey-5">{{ fields.ai_tags_auto?.hint }}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            label="Save"
            :loading="saving"
            :disable="!changed"
          />
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import EnvKeys from 'src/components/Utilities/EnvKeys.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import {
  loadAiSettingsRequest,
  saveAiSettingsRequest,
  type AiAdminSettings,
} from 'src/utils/requests/ai';

const { price } = usePayments();

const loading = ref(true);
const saving = ref(false);
const settings = ref<AiAdminSettings>();
const form = reactive({
  ai_enabled: false,
  ai_credit_price: 0 as number | string,
  ai_credit_packs: '',
  ai_music_credits: 5 as number | string,
  ai_stems_credits: 5 as number | string,
  ai_music_max_seconds: 300 as number | string,
  ai_lyrics_auto: true,
  ai_lyrics_credits: 2 as number | string,
  ai_lyrics_explicit_words: '',
  ai_lyrics_review_words: '',
  ai_tags_auto: true,
});
let savedForm = '';

const fields = computed(() => settings.value?.fields ?? {});
const changed = computed(() => JSON.stringify(form) !== savedForm);

const fill = (data: AiAdminSettings) => {
  settings.value = data;
  const f = data.fields;
  form.ai_enabled = f.ai_enabled?.value === '1';
  form.ai_credit_price = Number(f.ai_credit_price?.value ?? 0);
  form.ai_credit_packs = f.ai_credit_packs?.value ?? '';
  form.ai_music_credits = Number(f.ai_music_credits?.value ?? 5);
  form.ai_stems_credits = Number(f.ai_stems_credits?.value ?? 5);
  form.ai_music_max_seconds = Number(f.ai_music_max_seconds?.value ?? 300);
  form.ai_lyrics_auto = f.ai_lyrics_auto?.value === '1';
  form.ai_lyrics_credits = Number(f.ai_lyrics_credits?.value ?? 2);
  form.ai_lyrics_explicit_words = f.ai_lyrics_explicit_words?.value ?? '';
  form.ai_lyrics_review_words = f.ai_lyrics_review_words?.value ?? '';
  form.ai_tags_auto = f.ai_tags_auto?.value === '1';
  savedForm = JSON.stringify(form);
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const save = async () => {
  saving.value = true;
  try {
    const body = await saveAiSettingsRequest({ ...form }).send();
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

.section {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
</style>
