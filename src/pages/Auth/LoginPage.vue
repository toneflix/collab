<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="sendCode" v-if="challenge">
      <p class="auth-subtitle">
        Enter the 6-digit code from your authenticator app. If you don't have your phone, use one of
        your recovery codes.
      </p>
      <div>
        <label class="auth-label" for="login-code">Code</label>
        <q-input
          outlined
          autofocus
          hide-bottom-space
          for="login-code"
          autocomplete="one-time-code"
          placeholder="123456"
          :error="!!codeError"
          :error-message="codeError"
          v-model="code"
        />
      </div>

      <q-btn
        unelevated
        no-caps
        type="submit"
        color="primary"
        text-color="dark"
        class="auth-submit"
        label="Sign in"
        :loading="checking"
        :disable="!code"
      />
      <q-btn flat no-caps class="auth-submit" label="Use another account" @click="challenge = ''" />
    </q-form>

    <q-form class="auth-form" @submit="send" v-else>
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
import { computed, ref } from 'vue';
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
import { notify } from 'src/utils/helpers';
import { reboot } from 'src/utils/proccessor';
import { twoFactorSignInRequest, type TwoFactorChallenge } from 'src/utils/requests/twoFactor';

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

/** Set while sign-in waits for a two-factor code */
const challenge = ref('');
const code = ref('');
const codeError = ref('');
const checking = ref(false);

const signedIn = (data: ResponseBody<User>) =>
  reboot().then(() => {
    if (data.data) {
      useBootstrapStore().saveAuthUser(data.data, data.token);
      router.replace(afterSignIn(data.data, route.query.redirect));
    }
  });

onSuccess(({ data }) => {
  const pending = data.data as unknown as Partial<TwoFactorChallenge>;

  if (pending?.twoFactor && pending.challenge) {
    challenge.value = pending.challenge;
    code.value = '';
    codeError.value = '';

    return;
  }

  signedIn(data);
});

const sendCode = async () => {
  checking.value = true;
  codeError.value = '';

  try {
    const data = await twoFactorSignInRequest(challenge.value, code.value.trim()).send();

    await signedIn(data);
  } catch (e) {
    const body = e as ResponseBody<string, Record<string, string | string[]>>;
    const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

    if (body?.errors?.challenge) {
      challenge.value = '';
      form.value.password = '';
      notify(first(body.errors.challenge) ?? body.message, 'error');

      return;
    }

    codeError.value = first(body?.errors?.code) ?? body?.message ?? 'That code did not work.';
  } finally {
    checking.value = false;
  }
};

useMeta(() => ({ title: t('title') || 'Sign in', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
