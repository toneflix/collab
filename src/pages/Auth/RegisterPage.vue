<template>
  <AuthShell>
    <h1 class="auth-title">{{ t('title') }}</h1>
    <p class="auth-subtitle" v-if="t('subtitle')">{{ t('subtitle') }}</p>

    <q-form class="auth-form" @submit="send">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="auth-label" for="register-firstname">{{ t('firstname_label') }}</label>
          <q-input
            outlined
            hide-bottom-space
            required
            for="register-firstname"
            autocomplete="given-name"
            :placeholder="t('firstname_placeholder')"
            :error="!!errors.firstname"
            :error-message="errors.firstname"
            v-model="form.firstname"
          />
        </div>
        <div>
          <label class="auth-label" for="register-lastname">{{ t('lastname_label') }}</label>
          <q-input
            outlined
            hide-bottom-space
            required
            for="register-lastname"
            autocomplete="family-name"
            :placeholder="t('lastname_placeholder')"
            :error="!!errors.lastname"
            :error-message="errors.lastname"
            v-model="form.lastname"
          />
        </div>
      </div>

      <div>
        <label class="auth-label" for="register-email">{{ t('email_label') }}</label>
        <q-input
          outlined
          hide-bottom-space
          required
          for="register-email"
          type="email"
          autocomplete="email"
          :placeholder="t('email_placeholder')"
          :error="!!errors.email"
          :error-message="errors.email"
          v-model="form.email"
        />
      </div>

      <div>
        <label class="auth-label" for="register-phone">{{ t('phone_label') }}</label>
        <q-input
          outlined
          hide-bottom-space
          for="register-phone"
          type="tel"
          autocomplete="tel"
          :placeholder="t('phone_placeholder')"
          :error="!!errors.phone"
          :error-message="errors.phone"
          v-model="form.phone"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="auth-label" for="register-password">{{ t('password_label') }}</label>
          <PasswordInput
            required
            for="register-password"
            autocomplete="new-password"
            :placeholder="t('password_placeholder')"
            :error="!!errors.password"
            :error-message="errors.password"
            v-model="form.password"
          />
        </div>
        <div>
          <label class="auth-label" for="register-confirm">{{ t('password_confirm_label') }}</label>
          <PasswordInput
            required
            for="register-confirm"
            autocomplete="new-password"
            :placeholder="t('password_confirm_placeholder')"
            :error="!!errors.password_confirmation"
            :error-message="errors.password_confirmation"
            v-model="form.password_confirmation"
          />
        </div>
      </div>

      <div>
        <div class="flex items-start gap-2 no-wrap">
          <q-checkbox dense color="primary" class="!flex-none mt-0.5" v-model="form.accept" />
          <p class="m-0 text-sm leading-relaxed text-fg-muted">
            <span class="cursor-pointer" @click="form.accept = !form.accept">{{ t('terms_before') }}</span>
            {{ ' ' }}
            <router-link class="auth-link" target="_blank" :to="{ name: 'terms' }">{{ t('terms_link') }}</router-link>
            {{ ` ${t('terms_between')} ` }}
            <router-link class="auth-link" target="_blank" :to="{ name: 'privacy' }">{{ t('privacy_link') }}</router-link>
          </p>
        </div>
        <div class="mt-1 auth-error" v-if="errors.accept">{{ errors.accept }}</div>
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
      <router-link class="auth-link" :to="{ name: 'auth.login', query: $route.query }">
        {{ t('footer_link') }}
      </router-link>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
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
const t = (key: string) => authText('register', key);

const { form, send, error, loading, onSuccess } = useForm(
  (form) =>
    alova.Post<ResponseBody<User>>('auth/register', form, {
      params: { with: 'permissions,roles' },
    }),
  {
    initialForm: {
      email: '',
      phone: '',
      lastname: '',
      firstname: '',
      accept: false,
      password: '',
      password_confirmation: '',
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

useMeta(() => ({ title: t('title') || 'Sign up', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
