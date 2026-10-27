<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="send">
      <AuthFormError :error="error" />
      <div>
        <label class="auth-label" for="login-email">{{ t('email_label') }}</label>
        <q-input
          outlined
          hide-bottom-space
          for="login-email"
          type="email"
          autocomplete="email"
          :placeholder="t('email_placeholder')"
          :error="!!errors.email"
          :error-message="errors.email"
          v-model="form.email"
        />
      </div>

      <div>
        <label class="auth-label" for="login-password">{{ t('password_label') }}</label>
        <PasswordInput
          for="login-password"
          autocomplete="current-password"
          :placeholder="t('password_placeholder')"
          :error="!!errors.password"
          :error-message="errors.password"
          v-model="form.password"
        />
      </div>

      <div class="auth-row">
        <q-checkbox dense color="primary" :label="t('remember')" v-model="form.remember" />
        <router-link class="auth-link text-sm" :to="{ name: 'auth.forgot' }">
          {{ t('forgot_link') }}
        </router-link>
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
      <router-link class="auth-link" :to="{ name: 'auth.register', query: $route.query }">
        {{ t('footer_link') }}
      </router-link>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthFormError from 'src/components/Auth/AuthFormError.vue';
import { computed } from 'vue';
import { useMeta } from 'quasar';
import { useForm } from 'alova/client';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import PasswordInput from 'src/components/Auth/PasswordInput.vue';
import { alova } from 'src/boot/alova';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';
import { afterSignIn } from 'src/utils/auth-redirect';
import { ResponseBody, User } from 'src/utils/models';
import { reboot } from 'src/utils/proccessor';

const route = useRoute();
const router = useRouter();
const t = (key: string) => authText('login', key);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<User>>('auth/login', form, {
      params: { with: 'permissions,roles' },
    }),
  {
    initialForm: {
      remember: false,
      password: '',
      email: '',
    },
  },
);

const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

onSuccess(({ data }) => {
  reboot().then(() => {
    if (data.data) {
      useBootstrapStore().saveAuthUser(data.data, data.token);
      router.replace(afterSignIn(data.data, route.query.redirect));
    }
  });
});

useMeta(() => ({ title: t('title') || 'Sign in', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
