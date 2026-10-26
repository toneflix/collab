<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Auth pages</h1>
        <p class="text-grey-5">Layout, banner and text of sign-in, sign-up and recovery.</p>
      </div>

      <BlockSkeleton variant="form" :count="6" v-if="loading" />

      <q-form @submit="save" v-else-if="settings">
        <SettingsSections :sections="sections" :marked="unsaved">
          <template #layout>
            <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <button
                type="button"
                class="layout-card"
                :class="{ 'layout-card--on': layout === option.key }"
                :key="option.key"
                @click="layout = option.key"
                v-for="option in settings.layouts"
              >
                <span class="layout-card__preview">
                  <span class="layout-card__form" :style="{ flexBasis: `${option.form}%` }">
                    <i></i><i></i><i></i>
                  </span>
                  <span class="layout-card__banner" :style="{ flexBasis: `${option.banner}%` }" v-if="option.banner"></span>
                </span>
                <span class="font-bold">{{ option.title }}</span>
                <span class="text-sm text-grey-5">
                  {{ option.banner ? `${option.form} / ${option.banner}` : 'No banner' }}
                </span>
              </button>
            </div>

            <div class="mt-8">
              <div class="font-bold">Banner image</div>
              <p class="text-sm text-grey-5">Shown behind the banner text. Without one, the banner shows an animated waveform.</p>

              <div class="banner-pick">
                <img :src="settings.banner" alt="" class="banner-pick__image" v-if="settings.banner" />
                <div class="banner-pick__empty" v-else>
                  <q-icon name="lucide-image" size="28px" />
                </div>

                <div class="flex flex-wrap gap-2">
                  <q-btn
                    outline
                    no-caps
                    icon="lucide-upload"
                    class="!flex-none"
                    :label="settings.banner ? 'Replace' : 'Upload'"
                    :loading="uploading"
                    @click="picker?.click()"
                  />
                  <q-btn
                    flat
                    no-caps
                    color="negative"
                    icon="lucide-trash-2"
                    label="Remove"
                    class="!flex-none"
                    :loading="removing"
                    @click="removeBanner"
                    v-if="settings.banner"
                  />
                </div>
                <input ref="picker" type="file" accept="image/*" class="hidden" @change="upload" />
              </div>
            </div>
          </template>

          <template #[page.key] :key="page.key" v-for="page in settings.pages">
            <div class="grid gap-3 sm:grid-cols-2">
              <q-input
                dark
                outlined
                autogrow
                stack-label
                :class="{ 'sm:col-span-2': long(field.default) }"
                :key="field.key"
                :label="field.label"
                :placeholder="field.default"
                v-model="texts[field.key]"
                v-for="field in page.fields"
              >
                <template #append v-if="texts[field.key]">
                  <IconBtn
                    size="sm"
                    icon="lucide-rotate-ccw"
                    aria-label="Use the default"
                    @click="texts[field.key] = ''"
                  >
                    <q-tooltip>Use the default</q-tooltip>
                  </IconBtn>
                </template>
              </q-input>
            </div>
          </template>

          <template #footer>
            <span class="text-sm text-grey-5" v-if="changed">Unsaved changes</span>
            <q-btn
              unelevated
              no-caps
              color="toneflix"
              type="submit"
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
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import IconBtn from 'src/components/Buttons/IconBtn.vue';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import { reboot } from 'src/utils/proccessor';
import {
  loadAuthPagesRequest,
  removeAuthBannerRequest,
  saveAuthPagesRequest,
  uploadAuthBannerRequest,
  type AuthPagesSettings,
} from 'src/utils/requests/auth-pages';

const icons: Record<string, string> = {
  banner: 'lucide-image',
  login: 'lucide-log-in',
  register: 'lucide-user-plus',
  forgot: 'lucide-key-round',
  reset: 'lucide-lock',
  verify: 'lucide-mail',
};

const loading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const removing = ref(false);
const picker = ref<HTMLInputElement>();
const settings = ref<AuthPagesSettings>();
const layout = ref('45-55');
const texts = reactive<Record<string, string>>({});
const saved = ref<{ layout: string; texts: Record<string, string> }>({ layout: '', texts: {} });

const sections = computed<SettingsSection[]>(() => [
  { key: 'layout', icon: 'lucide-panels-top-left', title: 'Layout', caption: 'Form and banner widths, banner image.' },
  ...(settings.value?.pages ?? []).map((page) => ({
    key: page.key,
    icon: icons[page.key] ?? 'lucide-type',
    title: page.title,
    caption: `${page.fields.length} texts`,
  })),
]);

const textChanged = (key: string) => (texts[key] ?? '') !== (saved.value.texts[key] ?? '');
const changed = computed(
  () => layout.value !== saved.value.layout || Object.keys(texts).some(textChanged),
);
const unsaved = computed(() => [
  ...(layout.value !== saved.value.layout ? ['layout'] : []),
  ...(settings.value?.pages ?? [])
    .filter((page) => page.fields.some((field) => textChanged(field.key)))
    .map((page) => page.key),
]);

const long = (text: string) => text.length > 48;

const fill = (data: AuthPagesSettings) => {
  settings.value = data;
  layout.value = data.layout;

  for (const page of data.pages) {
    for (const field of page.fields) {
      texts[field.key] = field.value ?? '';
    }
  }

  saved.value = { layout: data.layout, texts: { ...texts } };
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;

  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const run = async (
  flag: { value: boolean },
  request: () => Promise<ResponseBody<AuthPagesSettings>>,
  fallback: string,
) => {
  flag.value = true;

  try {
    const body = await request();
    const unsavedTexts = { ...texts };
    const unsavedLayout = layout.value;

    fill(body.data);

    // Keep edits that were not part of this request, like texts while a banner uploads.
    Object.assign(texts, unsavedTexts);
    layout.value = unsavedLayout;

    notify(body.message, 'success');
    void reboot();
  } catch (e) {
    notify(errorText(e, fallback), 'error');
  } finally {
    flag.value = false;
  }
};

const save = () =>
  run(
    saving,
    () => saveAuthPagesRequest({ layout: layout.value, texts: { ...texts } }).send(),
    "The auth pages couldn't be saved.",
  );

const upload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  input.value = '';

  if (file) {
    void run(uploading, () => uploadAuthBannerRequest(file).send(), "The banner couldn't be uploaded.");
  }
};

const removeBanner = () =>
  run(removing, () => removeAuthBannerRequest().send(), "The banner couldn't be removed.");

onMounted(async () => {
  try {
    fill(await loadAuthPagesRequest().send());
  } catch (e) {
    notify(errorText(e, "The auth pages couldn't be loaded."), 'error');
  } finally {
    loading.value = false;
  }
});

useMeta({ title: 'Auth pages', titleTemplate: (title) => `${title} - Toneflix Music` });
</script>

<style lang="scss" scoped>
.layout-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  text-align: left;
  color: inherit;
  background: var(--tf-surface-1);
  cursor: pointer;
  transition: border-color var(--tf-duration) var(--tf-ease);

  &:hover {
    border-color: var(--tf-border-strong);
  }

  &--on {
    border-color: var(--tf-primary);
    box-shadow: 0 0 0 1px var(--tf-primary);
  }
}

.layout-card__preview {
  display: flex;
  gap: 4px;
  height: 64px;
  margin-bottom: 8px;
  padding: 4px;
  border-radius: var(--tf-radius-md);
  background: var(--tf-bg);
}

.layout-card__form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 0 10%;

  i {
    height: 5px;
    border-radius: 3px;
    background: var(--tf-surface-3);

    &:last-child {
      background: var(--tf-primary);
    }
  }
}

.layout-card__banner {
  border-radius: 6px;
  background: linear-gradient(160deg, var(--tf-primary-soft), var(--tf-surface-3));
}

.banner-pick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 12px;

  > * {
    flex: none;
  }
}

.banner-pick__image,
.banner-pick__empty {
  width: 160px;
  height: 100px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  object-fit: cover;
}

.banner-pick__empty {
  display: grid;
  place-items: center;
  color: var(--tf-text-subtle);
  background: var(--tf-surface-1);
}
</style>
