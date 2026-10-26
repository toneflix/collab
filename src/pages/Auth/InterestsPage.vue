<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="save">
      <InterestPicker :picked-topics="pickedTopics" v-model:genres="genres" v-model:topics="topics" />

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
        :disable="!genres.length && !topics.length"
      />
    </q-form>

    <p class="auth-footer">
      <a class="auth-link" href="#" @click.prevent="leave">{{ t('skip') }}</a>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import InterestPicker from 'src/components/Auth/InterestPicker.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';
import { homeFor, safeRedirect } from 'src/utils/auth-redirect';
import { notify } from 'src/utils/helpers';
import { Interests, ResponseBody } from 'src/utils/models';
import { loadInterestsRequest, saveInterestsRequest } from 'src/utils/requests/interests';

const boot = useBootstrapStore();
const route = useRoute();
const router = useRouter();
const t = (key: string, values?: Record<string, string | number>) => authText('interests', key, values);

const genres = ref<number[]>([]);
const topics = ref<number[]>([]);
const pickedTopics = ref<Interests['topics']>([]);
const saving = ref(false);
const error = ref('');

const leave = () => router.replace(safeRedirect(route.query.redirect) ?? homeFor(boot.user));

const save = async () => {
  saving.value = true;
  error.value = '';

  try {
    const { data } = await saveInterestsRequest({ genres: genres.value, topics: topics.value }).send();

    boot.setUser({ ...boot.user, interestsAt: data.interestsAt });
    await leave();
  } catch (e) {
    const body = e as ResponseBody<string>;

    error.value = body?.errors?.genres || body?.errors?.topics || body?.message || '';
    notify(error.value || 'We could not save your interests.', 'error');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  const { data } = await loadInterestsRequest().send();

  genres.value = data.genres.map((genre) => genre.id);
  topics.value = data.topics.map((topic) => topic.id);
  pickedTopics.value = data.topics;
});

useMeta(() => ({ title: t('title') || 'Your interests', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
