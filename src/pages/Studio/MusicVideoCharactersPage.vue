<template>
  <q-page class="p-4">
    <div class="max-w-full mx-auto md:max-w-3xl lg:max-w-4xl">
      <div class="flex items-center gap-3 mb-1 no-wrap">
        <IconBtn
          icon="lucide-arrow-left"
          class="flex-none!"
          aria-label="Back to music videos"
          :to="{ name: 'studio.videos' }"
        />
        <h4 class="text-xl font-semibold md:text-2xl flex-none!">
          My characters
        </h4>
        <q-btn
          unelevated
          rounded
          no-caps
          color="toneflix"
          text-color="dark"
          label="Add a character"
          class="flex-none! ml-auto"
          icon="lucide-plus"
          @click="startNew"
          v-if="ownPhotos"
        />
      </div>
      <p class="mb-8 text-sm text-grey-5">
        Cast them in any new video so they look the same in each one.
      </p>

      <SimpleInfo
        icon="lucide-users"
        class="mb-4"
        title="No characters yet."
        text="Save one from the cast of a music video."
        v-if="!characters.length && !loading"
      />

      <div class="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div
          class="cast"
          :key="character.id"
          v-intersection="
            (e: IntersectionObserverEntry) =>
              onIntersect(e, i === characters.length - 1)
          "
          v-for="(character, i) in characters"
        >
          <a
            class="cast__sheet"
            target="_blank"
            rel="noopener"
            :href="character.sheetUrl"
          >
            <img
              :src="character.sheetUrl"
              :alt="`${character.name} character sheet`"
              loading="lazy"
            />
          </a>
          <div class="flex items-start gap-1 p-3 no-wrap">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">
                {{ character.name }}
              </div>
              <div class="mt-1 text-xs text-grey-5 line-clamp-2">
                {{ character.description || 'No description' }}
              </div>
            </div>
            <IconBtn
              size="sm"
              icon="lucide-pencil"
              class="flex-none!"
              aria-label="Edit character"
              @click="startEdit(character)"
            />
            <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              aria-label="Remove character"
              @click="remove(character, i)"
            />
          </div>
        </div>
      </div>

      <ListSkeleton
        avatar="square"
        :rows="3"
        v-if="loading && !characters.length"
      />
    </div>

    <q-dialog v-model="editing">
      <q-card
        dark
        class="character-dialog flex-none!"
        style="width: 440px; max-width: 100vw"
      >
        <q-form class="flex flex-col gap-3 p-4" @submit.prevent="save">
          <div class="text-lg font-bold">
            {{ form.id ? 'Edit character' : 'Add a character' }}
          </div>
          <label class="sheet-pick" v-if="!form.id">
            <img :src="form.preview" alt="" v-if="form.preview" />
            <span class="flex flex-col items-center gap-1 text-grey-6" v-else>
              <q-icon name="lucide-image-plus" size="22px" />
              <span class="text-xs">Character sheet</span>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="pick"
            />
          </label>
          <q-input
            dark
            filled
            dense
            maxlength="80"
            label="Name"
            :error="!!errors.name"
            :error-message="errors.name"
            v-model="form.name"
          />
          <q-input
            dark
            filled
            dense
            autogrow
            maxlength="600"
            label="Who they are (optional)"
            placeholder="The singer's younger brother"
            v-model="form.description"
          />
          <q-checkbox
            dark
            dense
            color="toneflix"
            label="This image is of me or someone who agreed, or I have the right to use it"
            v-model="form.consent"
            v-if="!form.id"
          />
          <div class="text-xs text-negative" v-if="formError">
            {{ formError }}
          </div>
          <div class="flex justify-end gap-2">
            <q-btn
              flat
              rounded
              no-caps
              label="Cancel"
              class="flex-none!"
              v-close-popup
            />
            <q-btn
              unelevated
              rounded
              no-caps
              type="submit"
              color="toneflix"
              text-color="dark"
              label="Save"
              class="flex-none!"
              :loading="saving"
              :disable="!formReady"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta, useQuasar } from 'quasar';
import { computed, onMounted, reactive, ref } from 'vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notifyError } from 'src/utils/composer';
import {
  deleteSavedCharacterRequest,
  loadSavedCharactersRequest,
  updateSavedCharacterRequest,
  uploadSavedCharacterRequest,
  type SavedCharacter,
} from 'src/utils/requests/videos';

defineOptions({ name: 'MusicVideoCharactersPage' });

const $q = useQuasar();
const boot = useBootstrapStore();

const characters = ref<SavedCharacter[]>([]);
const ownPhotos = ref(false);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const editing = ref(false);
const saving = ref(false);
const errors = ref<Record<string, string>>({});

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
  sheet: null as File | null,
  preview: null as string | null,
  consent: false,
});

const formReady = computed(
  () => !!form.name.trim() && (!!form.id || (!!form.sheet && form.consent)),
);
const formError = computed(
  () => errors.value.sheet || errors.value.consent || errors.value.character,
);

const load = async (reset = false) => {
  if (reset) page.value = 1;
  loading.value = true;
  try {
    const res = await loadSavedCharactersRequest(page.value).send();
    characters.value = reset ? res.data : [...characters.value, ...res.data];
    lastPage.value = res.meta?.lastPage ?? 1;
    ownPhotos.value = !!res.ownPhotos;
  } catch (e) {
    notifyError(e, "Your characters couldn't be loaded.");
  } finally {
    loading.value = false;
  }
};

const onIntersect = (evt: IntersectionObserverEntry, isLast: boolean) => {
  if (
    isLast &&
    evt.isIntersecting &&
    !loading.value &&
    page.value < lastPage.value
  ) {
    page.value++;
    void load();
  }
};

const fill = (character?: SavedCharacter) => {
  if (form.preview) URL.revokeObjectURL(form.preview);
  form.id = character?.id ?? null;
  form.name = character?.name ?? '';
  form.description = character?.description ?? '';
  form.sheet = null;
  form.preview = null;
  form.consent = false;
  errors.value = {};
  editing.value = true;
};

const startNew = () => fill();
const startEdit = (character: SavedCharacter) => fill(character);

const pick = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (form.preview) URL.revokeObjectURL(form.preview);
  form.sheet = file;
  form.preview = URL.createObjectURL(file);
};

const save = async () => {
  saving.value = true;
  errors.value = {};
  const values = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
  };
  try {
    if (form.id) {
      const res = await updateSavedCharacterRequest(form.id, values).send();
      characters.value = characters.value.map((c) =>
        c.id === res.data.id ? res.data : c,
      );
    } else {
      const res = await uploadSavedCharacterRequest({
        ...values,
        sheet: form.sheet as File,
        consent: form.consent,
      }).send();
      characters.value = [res.data, ...characters.value];
    }
    editing.value = false;
  } catch (e) {
    const err = e as { errors?: Record<string, string | string[]> };
    errors.value = Object.fromEntries(
      Object.entries(err.errors ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? (value[0] ?? '') : value,
      ]),
    );
    if (!Object.keys(errors.value).length)
      notifyError(e, "The character couldn't be saved.");
  } finally {
    saving.value = false;
  }
};

const remove = (character: SavedCharacter, i: number) => {
  $q.dialog({
    dark: true,
    title: `Remove ${character.name}?`,
    message: 'Videos they are already in keep them.',
    ok: {
      label: 'Remove',
      color: 'negative',
      noCaps: true,
      unelevated: true,
      rounded: true,
    },
    cancel: { label: 'Keep', flat: true, noCaps: true, rounded: true },
  }).onOk(async () => {
    try {
      await deleteSavedCharacterRequest(character.id).send();
      characters.value.splice(i, 1);
    } catch (e) {
      notifyError(e, "The character couldn't be removed.");
    }
  });
};

onMounted(() => void load(true));

useMeta(() => ({
  title: 'My characters',
  titleTemplate: (title) => `${title} - ${boot.configuration.app_name}`,
}));
</script>

<style lang="scss" scoped>
.cast {
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);

  &__sheet {
    display: block;
    aspect-ratio: 16 / 9;
    background: rgba(255, 255, 255, 0.04);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.character-dialog {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
}

.sheet-pick {
  display: grid;
  place-items: center;
  width: 100%;
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
</style>
