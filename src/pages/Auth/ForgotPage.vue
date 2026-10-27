<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="send">
      <AuthFormError :error="error" />
      <div>
        <label class="auth-label" for="forgot-email">{{ t('email_label') }}</label>
        <q-input
          outlined
          hide-bottom-space
          required
          for="forgot-email"
          type="email"
          autocomplete="email"
          :placeholder="t('email_placeholder')"
          :error="!!errors.email"
          :error-message="errors.email"
          v-model="form.email"
        />
      </div>

      <q-btn
        unelevated
        no-caps
        type="submit"
        color="primary"
        text-color="dark"
        class="auth-submit"
        :label="t('submit')"
        :loading="loading"
      />
    </q-form>

    <p class="auth-footer">
      {{ t('footer_text') }}
      <router-link class="auth-link" :to="{ name: 'auth.login' }">{{ t('footer_link') }}</router-link>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthFormError from 'src/components/Auth/AuthFormError.vue';
import { computed } from 'vue';
import { useMeta } from 'quasar';
import { useForm } from 'alova/client';
import { useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import { alova } from 'src/boot/alova';
import { authText } from 'src/utils/auth-pages';
import { notify } from 'src/utils/helpers';
import { ResponseBody } from 'src/utils/models';

const router = useRouter();
const t = (key: string) => authText('forgot', key);

const { form, send, error, loading, onSuccess } = useForm(
  (form) => alova.Post<ResponseBody<Record<string, string>>>('auth/forgot-password', form),
  {
    initialForm: {
      email: '',
    },
  },
);

const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

onSuccess(({ data }) => {
  notify(data.message, 'success');
  router.replace({ name: 'reset.password', query: { email: form.value.email } });
});

useMeta(() => ({ title: t('title') || 'Forgot password', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
