<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="save">
      <div class="flex flex-wrap gap-2" v-if="loadingGenres">
        <q-skeleton type="QChip" width="96px" height="34px" :key="n" v-for="n in 12" />
      </div>
      <ChoiceChips :options="genreOptions" :max="MAX_GENRES" v-model="picked" v-else />

      <p class="m-0 text-sm text-fg-muted" v-if="picked.length">
        {{ t('picked', { count: picked.length }) }}
      </p>
      <div class="auth-error" v-if="error">{{ error }}</div>

      <q-btn
        unelevated
        no-caps
        type="submit"
        color="primary"
        text-color="dark"
        class="auth-submit"
        :label="t('submit')"
        :loading="saving"
        :disable="!picked.length"
      />
    </q-form>

    <p class="auth-footer">
      <a class="auth-link" href="#" @click.prevent="leave">{{ t('skip') }}</a>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import ChoiceChips from 'src/components/Auth/ChoiceChips.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';
import { homeFor, safeRedirect } from 'src/utils/auth-redirect';
import { notify } from 'src/utils/helpers';
import { Genre, ResponseBody } from 'src/utils/models';
import { loadGenresRequest } from 'src/utils/requests/requests';
import { loadInterestsRequest, saveInterestsRequest } from 'src/utils/requests/interests';

const MAX_GENRES = 20;

const boot = useBootstrapStore();
const route = useRoute();
const router = useRouter();
const t = (key: string, values?: Record<string, string | number>) => authText('interests', key, values);

const genres = ref<Genre[]>([]);
const picked = ref<number[]>([]);
const loadingGenres = ref(true);
const saving = ref(false);
const error = ref('');

const genreOptions = computed(() =>
  genres.value.map((genre) => ({ value: Number(genre.id), label: genre.title })),
);

const leave = () => router.replace(safeRedirect(route.query.redirect) ?? homeFor(boot.user));

const save = async () => {
  saving.value = true;
  error.value = '';

  try {
    const { data } = await saveInterestsRequest({ genres: picked.value }).send();

    boot.setUser({ ...boot.user, interestsAt: data.interestsAt });
    await leave();
  } catch (e) {
    const body = e as ResponseBody<string>;

    error.value = body?.errors?.genres || body?.message || '';
    notify(error.value || 'We could not save your interests.', 'error');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const [list, current] = await Promise.all([
      loadGenresRequest({ limit: 100 }).send(),
      loadInterestsRequest().send(),
    ]);

    genres.value = list.data;
    picked.value = current.data.genres.map((genre) => genre.id);
  } finally {
    loadingGenres.value = false;
  }
});

useMeta(() => ({ title: t('title') || 'Your interests', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
