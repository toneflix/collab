<template>
  <AuthShell>
    <div class="auth-done" v-if="step === 'done'">
      <q-icon name="lucide-circle-check" size="48px" />
      <h1 class="auth-title">{{ t('done_title') }}</h1>
      <p class="auth-subtitle">{{ t('done_text') }}</p>
      <q-btn
        unelevated
        no-caps
        color="primary"
        text-color="dark"
        class="mt-2 auth-submit"
        :label="t('done_button')"
        :to="{ name: 'auth.login' }"
      />
    </div>

    <template v-else>
      <h1 class="auth-title">{{ step === 'code' ? t('title') : t('password_title') }}</h1>
      <p class="auth-subtitle" v-if="step === 'code' && t('subtitle')">
        {{ t('subtitle', { email: email || 'your email' }) }}
      </p>

      <q-form class="auth-form" @submit="submit">
        <template v-if="step === 'code'">
          <div>
            <label class="auth-label">{{ t('code_label') }}</label>
            <OtpInput :error="!!errors.code" :disabled="loading" v-model="code" @complete="nextTick(submit)" />
            <div class="mt-2 auth-error" v-if="errors.code">{{ errors.code }}</div>
          </div>

          <q-btn
            unelevated
            no-caps
            type="submit"
            color="primary"
            text-color="dark"
            class="auth-submit"
            :label="t('code_submit')"
            :loading="loading"
            :disable="code.length < 6"
          />

          <router-link class="text-center auth-link text-sm" :to="{ name: 'auth.forgot' }">
            {{ t('new_code') }}
          </router-link>
        </template>

        <template v-else>
          <div>
            <label class="auth-label" for="reset-password">{{ t('password_label') }}</label>
            <PasswordInput
              required
              for="reset-password"
              autocomplete="new-password"
              :placeholder="t('password_placeholder')"
              :error="!!errors.password"
              :error-message="errors.password"
              v-model="password"
            />
          </div>

          <div>
            <label class="auth-label" for="reset-confirm">{{ t('password_confirm_label') }}</label>
            <PasswordInput
              required
              for="reset-confirm"
              autocomplete="new-password"
              :placeholder="t('password_confirm_placeholder')"
              :error="!!errors.password_confirmation"
              :error-message="errors.password_confirmation"
              v-model="confirmation"
            />
          </div>

          <div class="auth-error" v-if="errors.code">{{ errors.code }}</div>

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
        </template>
      </q-form>

      <p class="auth-footer">
        {{ t('footer_text') }}
        <router-link class="auth-link" :to="{ name: 'auth.login' }">{{ t('footer_link') }}</router-link>
      </p>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import AuthShell from 'src/components/Auth/AuthShell.vue';
import OtpInput from 'src/components/Auth/OtpInput.vue';
import PasswordInput from 'src/components/Auth/PasswordInput.vue';
import { alova } from 'src/boot/alova';
import { authText } from 'src/utils/auth-pages';
import { ResponseBody } from 'src/utils/models';

const route = useRoute();
const t = (key: string, values?: Record<string, string>) => authText('reset', key, values);

const step = ref<'code' | 'password' | 'done'>('code');
const code = ref('');
const password = ref('');
const confirmation = ref('');
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const post = async (url: string, body: Record<string, string>) => {
  loading.value = true;
  errors.value = {};

  try {
    return await alova.Post<ResponseBody<{ valid?: boolean; email?: string }>>(url, body).send();
  } catch (e) {
    errors.value = (e as ResponseBody<string>)?.errors || {};
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  if (loading.value) {
    return;
  }

  if (step.value === 'code') {
    const body = await post('auth/reset-password/check-code', { code: code.value });

    if (body) {
      email.value = body.data?.email || email.value;
      step.value = 'password';
    } else {
      code.value = '';
    }

    return;
  }

  const body = await post('auth/reset-password', {
    code: code.value,
    password: password.value,
    password_confirmation: confirmation.value,
  });

  if (body) {
    step.value = 'done';
  } else if (errors.value.code) {
    step.value = 'code';
    code.value = '';
  }
};

onMounted(() => {
  const token = route.query.token;

  if (typeof token === 'string' && token) {
    code.value = token;
    void submit();
  }
});

useMeta(() => ({ title: t('title') || 'Reset password', titleTemplate: (title) => `${title} - Toneflix Music` }));
</script>
